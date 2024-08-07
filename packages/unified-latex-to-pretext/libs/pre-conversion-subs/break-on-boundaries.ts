import { env, arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    anyEnvironment,
    anyMacro,
    match,
} from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { VFileMessage } from "vfile-message";

/**
 * All the divisions, where each item is {division macro, mapped environment}.
 * Note that this is ordered from the "largest" division to the "smallest" division.
 */
const divisions: { division: string; mappedEnviron: string }[] = [
    { division: "part", mappedEnviron: "_part" },
    { division: "chapter", mappedEnviron: "_chapter" },
    { division: "section", mappedEnviron: "_section" },
    { division: "subsection", mappedEnviron: "_subsection" },
    { division: "subsubsection", mappedEnviron: "_subsubsection" },
    { division: "paragraph", mappedEnviron: "_paragraph" },
    { division: "subparagraph", mappedEnviron: "_subparagraph" },
];

// check if a macro is a division macro
const isDivisionMacro = match.createMacroMatcher(
    divisions.map((x) => x.division)
);

// check if an environment is a newly created environment
const isMappedEnviron = match.createEnvironmentMatcher(
    divisions.map((x) => x.mappedEnviron)
);

/**
 * Breaks up division macros into environments. Returns an object of warning messages
 * for any groups that were removed.
 */
export function breakOnBoundaries(ast: Ast.Ast): { messages: VFileMessage[] } {
    // messages for any groups removed
    const messagesLst: { messages: VFileMessage[] } = { messages: [] };

    replaceNode(ast, (node) => {
        if (match.group(node)) {
            // remove if it contains a division as an immediate child
            if (
                node.content.some((child) => {
                    return anyMacro(child) && isDivisionMacro(child);
                })
            ) {
                const message = new VFileMessage(
                    "Warning: hoisted out of a group, which might break the LaTeX code."
                );

                // add the position of the group if available
                if (node.position) {
                    message.line = node.position.start.line;
                    message.column = node.position.start.column;
                    message.position = {
                        start: {
                            line: node.position.start.line,
                            column: node.position.start.column,
                        },
                        end: {
                            line: node.position.end.line,
                            column: node.position.end.column,
                        },
                    };
                }

                message.source = "LatexConversion";
                messagesLst.messages.push(message);

                return node.content;
            }
        }
    });

    visit(ast, (node, info) => {
        // needs to be an environment, root, or group node
        if (
            !(
                anyEnvironment(node) ||
                node.type === "root" ||
                match.group(node)
            ) ||
            // skip math mode
            info.context.hasMathModeAncestor
        ) {
            return;
        }
        // if it's an environment, make sure it isn't a newly created one
        else if (anyEnvironment(node) && isMappedEnviron(node)) {
            return;
        }

        // now break up the divisions, starting at part
        node.content = breakUp(node.content, 0);
    });

    replaceNode(ast, (node) => {
        // remove all old division nodes
        if (anyMacro(node) && isDivisionMacro(node)) {
            return null;
        }
    });

    return messagesLst;
}

/**
 * Recursively breaks up the AST at the division macros.
 */
function breakUp(content: Ast.Node[], depth: number): Ast.Node[] {
    // broke up all divisions
    if (depth > 6) {
        return content;
    }

    const splits = splitOnMacro(content, divisions[depth].division);

    // go through each segment to recursively break
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakUp(splits.segments[i], depth + 1);
    }

    createEnvironments(splits, divisions[depth].mappedEnviron);

    // rebuild this part of the AST
    return unsplitOnMacro(splits);
}

/**
 * Create the new environments that replace the division macros.
 */
function createEnvironments(
    splits: { segments: Ast.Node[][]; macros: Ast.Macro[] },
    newEnviron: string
): void {
    // loop through segments (skipping first segment)
    for (let i = 1; i < splits.segments.length; i++) {
        // get the title
        const title = getNamedArgsContent(splits.macros[i - 1])["title"];
        const titleArg: Ast.Argument[] = [];

        // create title argument
        if (title) {
            titleArg.push(arg(title, { braces: "[]" }));
        }

        // wrap segment with a new environment
        splits.segments[i] = [env(newEnviron, splits.segments[i], titleArg)];
    }
}
