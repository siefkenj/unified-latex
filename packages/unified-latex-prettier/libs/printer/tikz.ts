import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import * as PrettierTypes from "./prettier-types";
import {
    getNodeInfo,
    formatDocArray,
    hardline,
    join,
    ifBreak,
    breakParent,
    line,
    group,
    indent,
    softline,
    fill,
} from "./common";
import {
    printRaw,
} from "@unified-latex/unified-latex-util-print-raw";
import { match } from "@unified-latex/unified-latex-util-match";
import { trim } from "@unified-latex/unified-latex-util-trim";
import {
    parse as parseTikz,
    PathSpec,
    PathSpecNode,
    printRaw as tikzPrintRaw,
} from "@unified-latex/unified-latex-ctan/package/tikz";
import { printArgumentPgfkeys } from "./print-argument-pgfkeys";

export function printTikzArgument(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Argument;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const content: Doc[] = [];
    const nodes = [...node.content];
    trim(nodes);
    try {
        const tikzAst = parseTikz(nodes);
        if (tikzAst.content.length === 0) {
            content.push(";");
            return content;
        }

        const printer = new TikzArgumentPrinter(tikzAst, path, print);
        return printer.toDoc();
    } catch (e) {
        console.warn("Encountered error when trying to parse tikz argument", e);
    }

    content.push(";");

    return content;
}

/**
 * Print a fragment of an AST to a `Doc`.
 */
function printFragment(
    fragment: Ast.Node | Ast.Argument,
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc
): Doc {
    const tmpKey = Symbol();
    const currNode = path.getNode();
    if (!currNode) {
        throw new Error(
            "tried to print a fragment, but the current node is `null`"
        );
    }
    (currNode as any)[tmpKey] = fragment;
    const ret = print(tmpKey);
    delete (currNode as any)[tmpKey];
    return ret;
}

/**
 * Turn an item in a tikz PathSpec into a Doc for printing.
 */
function printTikzPathSpecNode(
    node: PathSpecNode,
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc
): Doc {
    switch (node.type) {
        case "comment":
            return printFragment(node, path, print);
        case "unknown":
            // `"unknown"` nodes contain regular AST nodes as children which couldn't be identified by the parser
            return printFragment(node.content, path, print);
        case "coordinate":
            return [printRaw(node.prefix), "(", printRaw(node.content), ")"];
        case "line_to":
            return node.command;
        case "square_brace_group":
            return printOptionalArgs(node.content);
        case "operation":
            return node.content.content;
        case "svg_operation": {
            const comments = node.comments.map((n) =>
                printTikzPathSpecNode(n, path, print)
            );
            const options = node.options ? printOptionalArgs(node.options) : [];
            const rest: Doc[] = node.options
                ? [group(indent([line, printRaw(node.content)]))]
                : [" ", printRaw(node.content)];
            return [...comments, "svg", options, ...rest];
        }
        case "curve_to": {
            const comments = node.comments.map((n) =>
                printTikzPathSpecNode(n, path, print)
            );
            const printedControls =
                node.controls.length > 1
                    ? [
                          printTikzPathSpecNode(node.controls[0], path, print),
                          " ",
                          "and",
                          line,
                          printTikzPathSpecNode(node.controls[1]!, path, print),
                      ]
                    : [printTikzPathSpecNode(node.controls[0], path, print)];
            return [
                ...comments,
                "..",
                " ",
                group(
                    indent(["controls", line, ...printedControls, " ", ".."])
                ),
            ];
        }
        case "animation": {
            const comments = node.comments.map((n) =>
                printTikzPathSpecNode(n, path, print)
            );

            return [
                ...comments,
                ":",
                node.attribute,
                " ",
                "=",
                " ",
                group(
                    indent([
                        printArgumentPgfkeys(node.content, {
                            openMark: "{",
                            closeMark: "}",
                        }),
                    ])
                ),
            ];
        }
        case "foreach": {
            const comments = node.comments.map((n) =>
                printTikzPathSpecNode(n, path, print)
            );
            const variables = [...node.variables];
            trim(variables);
            const list =
                node.list.type === "macro"
                    ? printFragment(node.list, path, print)
                    : printArgumentPgfkeys(node.list.content, {
                          openMark: "{",
                          closeMark: "}",
                          allowParenGroups: true,
                      });
            const doc = [
                ...comments,
                printRaw(node.start),
                " ",
                printRaw(variables),
            ];
            if (node.options) {
                doc.push(" ", indent(printOptionalArgs(node.options)));
            }

            // The list, e.g. `{1,2,...,9}`
            doc.push(" ", "in", " ", group(indent(list)));
            // The loop body
            // XXX: if we are in a tikz node, whitespace doesn't matter. If we are in a regular
            // part of the document, the loop body is whitespace-sensitive
            const commandType = node.command.type;
            switch (commandType) {
                case "foreach":
                    doc.push(
                        indent([
                            line,
                            printTikzPathSpecNode(node.command, path, print),
                        ])
                    );
                    break;
                case "macro":
                    doc.push(
                        indent([line, printFragment(node.command, path, print)])
                    );
                    break;
                case "group": {
                    const groupContent = [...node.command.content];
                    trim(groupContent);
                    doc.push(
                        " ",
                        indent(
                            group([
                                "{",
                                indent([
                                    softline,
                                    ...groupContent.map((n) =>
                                        printFragment(n, path, print)
                                    ),
                                ]),
                                softline,
                                "}",
                            ])
                        )
                    );
                    break;
                }
                default:
                    const invalidType: void = commandType;
                    console.warn(
                        `Unhandled command type when printing "foreach": ${invalidType}`
                    );
            }

            return indent(doc);
        }
    }
    console.warn(
        `Encountered unknown type when trying to print tikz PathSpec: "${
            (node as any).type
        }"`
    );
    return [];
}

function printOptionalArgs(nodes: Ast.Node[]): Doc {
    return printArgumentPgfkeys(nodes, {
        openMark: "[",
        closeMark: "]",
    });
}

/**
 * Utility to turn a Tikz PathSpec into a Prettier Doc.
 */
class TikzArgumentPrinter {
    #path: PrettierTypes.AstPath;
    #print: PrettierTypes.RecursivePrintFunc;
    nodes: PathSpec["content"];
    constructor(
        spec: PathSpec,
        path: PrettierTypes.AstPath,
        print: PrettierTypes.RecursivePrintFunc
    ) {
        this.#path = path;
        this.#print = print;
        this.nodes = [...spec.content];
    }

    nodeToDoc(node: PathSpecNode): Doc {
        return printTikzPathSpecNode(node, this.#path, this.#print);
    }

    toDoc(): Doc {
        const doc: Doc = [];
        const startArg = this.eatOptionalArg();
        if (startArg.optionalArg) {
            doc.push(
                ...startArg.comments.map((c) =>
                    printFragment(c, this.#path, this.#print)
                )
            );
            doc.push(printOptionalArgs(startArg.optionalArg.content));
        }

        const innerDoc: Doc = [];
        doc.push(group([indent(innerDoc), ";"]));
        let cycle = -1;
        while (this.nodes.length > 0) {
            cycle++;
            // If this is the first item being printed and the draw command has no optional
            // argument, then we force the command to start printing on the same line.
            const firstSep = cycle === 0 && !startArg.optionalArg ? " " : line;
            const comingUp = this.peek();
            //console.log("Coming up", comingUp, tikzPrintRaw(this.nodes));
            switch (comingUp) {
                case "short_path": {
                    const [n0, n1, n2] = this.nodes.splice(0, 3);
                    // A short path does not break
                    innerDoc.push(
                        firstSep,
                        this.nodeToDoc(n0),
                        " ",
                        this.nodeToDoc(n1),
                        " ",
                        this.nodeToDoc(n2)
                    );
                    continue;
                }
                case "long_path": {
                    // A long path consists of at least a node followed by a joiner
                    const [n0, n1] = this.nodes.splice(0, 2);
                    if (n1.type === "operation") {
                        this.nodes.unshift(n1);
                        innerDoc.push(
                            firstSep,
                            this.nodeToDoc(n0),
                            " ",
                            this.eatOperation()
                        );
                    } else {
                        innerDoc.push(
                            firstSep,
                            this.nodeToDoc(n0),
                            " ",
                            this.nodeToDoc(n1)
                        );
                    }
                    continue;
                }
                case "node":
                    {
                        const eatenNode = this.eatNode();
                        if (eatenNode) {
                            innerDoc.push(line, ...eatenNode);
                            continue;
                        }
                        console.warn(
                            "Expected to print a tikz `node` PathSpec but couldn't find the text `node`"
                        );
                    }
                    continue;
                case "operation":
                    innerDoc.push(firstSep, this.eatOperation());
                    continue;
                case "unknown": {
                    const node = this.nodes.shift()!;
                    innerDoc.push(firstSep, this.nodeToDoc(node));
                    continue;
                }
            }
            this.nodes.shift();
        }

        return doc;
    }

    /**
     * Look at the current node and the nodes that follow. Return what
     * "type" is recognized.
     */
    peek() {
        // A short path is two coordinates, joined by a line_to (with no coordinates/line_to's following).
        // If there are comments intermixed, the short path is broken.
        const [n0, n1, n2, n3] = [
            this.nodes[0],
            this.nodes[1],
            this.nodes[2],
            this.nodes[3],
        ];
        if (n0?.type === "coordinate" && isPathJoinOperation(n1)) {
            if (
                n2?.type === "coordinate" &&
                !(n3?.type === "coordinate" || isPathJoinOperation(n3))
            ) {
                return "short_path";
            }
            return "long_path";
        }
        if (n0?.type === "operation") {
            if (n0.content.content === "node") {
                // Nodes are a special type of operation.
                return "node";
            }
            return "operation";
        }

        return "unknown";
    }

    /**
     * Eat comments and an optional arg if present. If no optional
     * arg is present, do nothing.
     */
    eatOptionalArg() {
        let i = 0;
        const comments: Ast.Comment[] = [];
        let optionalArg:
            | (PathSpecNode & { type: "square_brace_group" })
            | null = null;
        for (; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (node.type === "square_brace_group") {
                optionalArg = node;
                i++;
                break;
            }
            if (node.type === "comment") {
                comments.push(node);
                continue;
            }
            break;
        }
        if (optionalArg) {
            // If we grabbed an optional argument, remove it and everything
            // preceding it.
            this.nodes.splice(0, i);
        }
        return { optionalArg, comments };
    }

    /**
     * Eat a `type === "operation"` node whose contents is `"node"`. I.e.,
     * the type of thing that shows up in `\path node at (1,1) {foo};`
     */
    eatNode(): Doc[] | null {
        const firstNode = this.nodes[0];
        if (
            firstNode?.type === "operation" &&
            firstNode.content.content === "node"
        ) {
            this.nodes.shift();
        } else {
            return null;
        }

        // From the tikz documentation:
        // \path … node ⟨foreach statements⟩ [⟨options⟩] (⟨name⟩) at(⟨coordinate⟩)
        //       :⟨animation attribute⟩={⟨options⟩} {⟨node contents⟩} …;
        //
        // Order of the parts of the specification.
        // Everything between “node” and the opening brace of a node is optional.
        // If there are ⟨foreach statements⟩, they must come first, directly following “node”.
        // Other than that, the ordering of all the other elements of a node specification
        // (the ⟨options⟩, the ⟨name⟩, ⟨coordinate⟩, and ⟨animation attribute⟩) is arbitrary, indeed,
        // there can be multiple occurrences of any of these elements (although for the name and the
        // coordinate this makes no sense).

        const innerDoc: Doc = [];
        const commentBlock: Doc = [];
        const doc: Doc = [commentBlock, "node", group(indent(innerDoc))];
        // We now peek to see if a group `{...}` is the next thing. If so,
        // we're going to eat everything up to it and call it quits. Otherwise,
        // we bail.
        let hasNodeArgument = false;
        let shouldBail = false;
        let i = 0;
        const comments: Doc[] = [];
        const options: Doc[] = [];
        const name: Doc[] = [];
        const atLocations: Doc[] = [];
        const animations: Doc[] = [];
        let content: Doc = [];
        for (; i < this.nodes.length && !shouldBail; i++) {
            const node = this.nodes[i];
            switch (node.type) {
                case "animation":
                    animations.push(this.nodeToDoc(node));
                    continue;
                case "comment": {
                    const comment: Ast.Comment = {
                        ...node,
                        leadingWhitespace: false,
                    };
                    comments.push(this.nodeToDoc(comment));
                    continue;
                }
                case "square_brace_group":
                    options.push(printOptionalArgs(node.content));
                    continue;
                case "coordinate":
                    name.push(this.nodeToDoc(node));
                    continue;
                case "operation": {
                    // An "at" should be followed by a coordinate or a macro. If it is,
                    // then we slurp it. Otherwise we bail.
                    if (node.content.content === "at") {
                        const nextNode = this.nodes[i + 1];
                        if (
                            !nextNode ||
                            !(
                                nextNode.type === "coordinate" ||
                                (nextNode.type === "unknown" &&
                                    match.anyMacro(nextNode.content))
                            )
                        ) {
                            shouldBail = true;
                            continue;
                        }
                        atLocations.push(["at", " ", this.nodeToDoc(nextNode)]);
                        i++;
                        continue;
                    }
                    shouldBail = true;
                    continue;
                }
                case "unknown": {
                    // If we're here, we must be the termination group.
                    if (match.group(node.content)) {
                        hasNodeArgument = true;
                        content = this.nodeToDoc(node);
                    }
                    // NOTE: the fallthrough here is on purpose. Finding the terminating
                    // groups should end our loop.
                }
            }
            break;
        }
        if (!hasNodeArgument) {
            return innerDoc;
        }
        // We have collected docs for all the nodes we've scanned, so delete
        // them from the list.
        this.nodes.splice(0, i + 1);

        // We standardize node rendering as `[options] :animations (name) at (pos) {content}`
        let isFirstElement = true;
        let isNamed = !(Array.isArray(name) && name.length === 0);
        // Comments get hoisted to before the "node" keyword
        for (const comment of comments) {
            commentBlock.push(comment, hardline);
        }
        if (options.length > 0) {
            innerDoc.push(join(" ", options));
            isFirstElement = false;
        }
        if (animations.length > 0) {
            innerDoc.push(isFirstElement ? " " : line);
            innerDoc.push(join(line, animations));
            isFirstElement = false;
        }
        if (isNamed) {
            innerDoc.push(isFirstElement ? " " : line);
            innerDoc.push(name);
            isFirstElement = false;
        }
        if (atLocations.length > 0) {
            innerDoc.push(isFirstElement || isNamed ? " " : line);
            innerDoc.push(join(line, atLocations));
            isFirstElement = false;
        }
        innerDoc.push(line, content);

        return doc;
    }

    /**
     * Eat a `type === "operation"` node, including its optional arguments.
     */
    eatOperation(): Doc[] {
        const node = this.nodes[0];
        if (node?.type === "operation") {
            this.nodes.shift();
        } else {
            return [];
        }

        const doc: Doc[] = [];
        if (node?.type !== "operation") {
            throw new Error("Expecting `operation` node.");
        }
        const options = this.eatOptionalArg();
        doc.push(
            ...options.comments.map((c) =>
                printFragment(c, this.#path, this.#print)
            ),
            node.content.content
        );
        if (options.optionalArg) {
            doc.push(indent(printOptionalArgs(options.optionalArg.content)));
        }

        return doc;
    }
}

const PATH_JOIN_OPERATIONS = new Set(["rectangle", "grid", "sin", "cos", "to"]);
/**
 * Return whether `node` is a "path join", like `--`, `rectangle`, etc.
 *
 * A path join is an operation that sits between two coordinates, like
 * `(a) -- (b)` or `(a) rectangle (b)`.
 */
function isPathJoinOperation(node?: PathSpecNode): boolean {
    if (!node) {
        return false;
    }
    switch (node.type) {
        case "line_to":
        case "curve_to":
            return true;
        case "operation":
            return PATH_JOIN_OPERATIONS.has(node.content.content);
    }
    return false;
}
