import { structuredClone } from "@unified-latex/structured-clone";
import { emptyArg, s } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import * as match from "@unified-latex/unified-latex-util-match";
import { parse } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { parseMacroSubstitutions } from "./parse-macro-substitutions";

export const LATEX_NEWCOMMAND = new Set([
    "newcommand",
    "renewcommand",
    "providecommand",
]);
export const XPARSE_NEWCOMMAND = new Set([
    "NewDocumentCommand",
    "RenewDocumentCommand",
    "ProvideDocumentCommand",
    "DeclareDocumentCommand",
    "NewExpandableDocumentCommand",
    "RenewExpandableDocumentCommand",
    "ProvideExpandableDocumentCommand",
    "DeclareExpandableDocumentCommand",
]);

const NEWCOMMAND_ARGUMENTS_REG = [
    "starred",
    "name",
    "numArgs",
    "default",
    "body",
] as const;
const NEWCOMMAND_ARGUMENTS_BEAMER = [
    "starred",
    null,
    "name",
    "numArgs",
    "default",
    "body",
] as const;
type NewcommandNamedArgs = Record<
    (typeof NEWCOMMAND_ARGUMENTS_REG)[number],
    Ast.Node[] | null
>;

/**
 * Get the named arguments for a `\newcommand` macro.
 */
function getNewcommandNamedArgs(node: Ast.Macro): NewcommandNamedArgs {
    if (!Array.isArray(node.args)) {
        throw new Error(
            `Found a '\\newcommand' macro without any arguments "${JSON.stringify(
                node
            )}"`
        );
    }
    const argNames =
        node.args.length === NEWCOMMAND_ARGUMENTS_BEAMER.length
            ? NEWCOMMAND_ARGUMENTS_BEAMER
            : NEWCOMMAND_ARGUMENTS_REG;
    return getNamedArgsContent(node, argNames) as NewcommandNamedArgs;
}

/**
 * Compute the xparse argument signature of the `\newcommand`/`\renewcommand`/etc. macro.
 */
export function newcommandMacroToSpec(node: Ast.Macro): string {
    if (LATEX_NEWCOMMAND.has(node.content)) {
        // The signature is `s m o o m`. The signature of the defined macro
        // is completely dependent on the optional args. E.g. the macro defined by
        // \newcommand*{\foo}[4][x]{\bar}
        // has 5 arguments with the first one optional
        if (!node.args) {
            console.warn(
                String.raw`Found a '\newcommand' macro that doesn't have any args`,
                node
            );
            return "";
        }
        const namedArgs = getNewcommandNamedArgs(node);
        if (namedArgs.numArgs == null) {
            return "";
        }
        let numArgsForSig = +printRaw(namedArgs.numArgs);
        let sigOptionalArg: string[] = [];
        // `namedArgs.default` determines the default value of the initial optional argument.
        // If it is present, we need to change the signature.
        if (namedArgs.default != null) {
            numArgsForSig--;
            sigOptionalArg = ["o"];
        }
        return [
            ...sigOptionalArg,
            ...Array.from({ length: numArgsForSig }).map((_) => "m"),
        ].join(" ");
    }
    if (XPARSE_NEWCOMMAND.has(node.content)) {
        if (!node.args?.length) {
            console.warn(
                String.raw`Found a '\NewDocumentCommand' macro that doesn't have any args`,
                node
            );
            return "";
        }
        const macroSpec = printRaw(node.args[1]?.content);
        return macroSpec.trim();
    }

    return "";
}

/**
 * Trims whitespace and removes the leading `\` from a macro name.
 */
function normalizeCommandName(str: string): string {
    str = str.trim();
    return str.startsWith("\\") ? str.slice(1) : str;
}

/**
 * Get the name of the macro defined with `\newcommand`/`\renewcommand`/etc..
 */
export function newcommandMacroToName(node: Ast.Macro): string {
    if (LATEX_NEWCOMMAND.has(node.content)) {
        // These commands all have a similar structure. E.g.:
        // \newcommand{\foo}[4][x]{\bar}
        if (!node.args?.length) {
            return "";
        }
        const namedArgs = getNewcommandNamedArgs(node);
        const definedName = namedArgs.name;
        if (!definedName) {
            console.warn("Could not find macro name defined in", node);
            return "";
        }
        return normalizeCommandName(printRaw(definedName));
    }
    if (XPARSE_NEWCOMMAND.has(node.content)) {
        if (!node.args?.length) {
            return "";
        }
        const definedName = node.args[0]?.content[0];
        if (!definedName) {
            console.warn("Could not find macro name defined in", node);
            return "";
        }
        return normalizeCommandName(printRaw(node.args[0].content));
    }

    return "";
}

/**
 * Returns the AST that should be used for substitution. E.g.,
 * `\newcommand{\foo}{\bar{#1}}` would return `\bar{#1}`.
 */
export function newcommandMacroToSubstitutionAst(node: Ast.Macro): Ast.Node[] {
    if (LATEX_NEWCOMMAND.has(node.content)) {
        // These commands all have a similar structure. E.g.:
        // \newcommand{\foo}[4][x]{\bar}
        if (!node.args?.length) {
            return [];
        }
        const namedArgs = getNewcommandNamedArgs(node);
        const substitution = namedArgs.body;
        if (!substitution) {
            console.warn("Could not find macro name defined in", node);
            return [];
        }
        return substitution;
    }
    if (XPARSE_NEWCOMMAND.has(node.content)) {
        if (!node.args?.length) {
            return [];
        }
        return node.args[2]?.content || [];
    }

    return [];
}

/**
 * A factory function. Given a macro definition, creates a function that accepts
 * the macro's arguments and outputs an Ast with the contents substituted (i.e.,
 * it expands the macro).
 */
export function createMacroExpander(
    substitution: Ast.Node[],
    signature?: string
): (macro: Ast.Macro) => Ast.Node[] {
    const cachedSubstitutionTree = structuredClone(substitution);
    const res = getMacroSubstitutionHashNumbers(cachedSubstitutionTree);

    if (res.size === 0) {
        return () => structuredClone(cachedSubstitutionTree);
    }

    const argSpec = parseArgspec(signature);
    const defaultArgs = argSpec
        .map((node) => {
            if (node.type === "embellishment") {
                return (
                    node.embellishmentDefaultArg ||
                    (Array(node.embellishmentTokens.length).fill(
                        undefined
                    ) as undefined[])
                );
            }
            return node.defaultArg;
        })
        .flat();

    return (macro: Ast.Macro) => {
        const retTree = structuredClone(cachedSubstitutionTree);
        const args = macro.args;

        const stack: number[] = [];
        let lastSelfReference: number | null = null;

        // Recursively expand macro arguments. If a self-reference is found, it returns
        // the corresponding hash number, which is used to special-case `O{#2} O{#1}`.
        function expandArgs(retTree: Ast.Node[]): void {
            replaceNode(retTree, (node) => {
                if (node.type !== "hash_number") {
                    return;
                }

                const hashNum = node.number;
                const arg = args?.[hashNum - 1];

                // Check if this argument is -NoValue-
                if (!arg || match.blankArgument(arg)) {
                    // Check if there exists a default argument for this hash number
                    const defaultArg = defaultArgs[hashNum - 1];
                    if (!defaultArg) {
                        return s(`#${hashNum}`);
                    }

                    // Detect self-references
                    if (stack.includes(hashNum)) {
                        lastSelfReference = hashNum;
                        return s(`#${hashNum}`);
                    }

                    // `defaultArg` is a string expression. The same `defaultArg` may be parsed
                    // differently depending on the context of `macro`, so we cannot cache
                    // the parse result of `defaultArg`. Currently we just call `parse` without
                    // taking account of parsing contexts, so actually the result can be cached,
                    // but this is not the correct thing to do. FIXME: we should probably pass
                    // some options that is provided to whatever function that called this to
                    // the below parse call. Note that `parse` is done in several passes, and we
                    // may be able to cache result of a first few passes that aren't context-dependent.
                    const subst = parse(defaultArg).content;
                    const nextHashNums = getMacroSubstitutionHashNumbers(subst);

                    if (nextHashNums.size === 0) {
                        return subst;
                    }

                    stack.push(hashNum);
                    try {
                        expandArgs(subst);

                        if (lastSelfReference !== hashNum) {
                            return subst;
                        }

                        // At this point, we have encountered #n while expanding #n.
                        // Check if we got exactly #n by expanding #n,
                        // in which case we should return the -NoValue-.
                        if (`#${hashNum}` === printRaw(subst)) {
                            // We are good, clear the last self-reference variable
                            lastSelfReference = null;
                            return emptyArg();
                        }

                        console.warn(
                            `Detected unrecoverable self-reference while expanding macro: ${printRaw(
                                macro
                            )}`
                        );
                        // Return a placeholder string, so that we know that
                        // this code path is not taken in unit tests.
                        return s("-Circular-");
                    } finally {
                        stack.pop();
                    }
                }

                return arg.content;
            });
        }

        expandArgs(retTree);
        return retTree;
    };
}

/**
 * Parses macro substitutions, mutates tree, and returns a list of hashnumbers that were encountered.
 */
export function getMacroSubstitutionHashNumbers(tree: Ast.Node[]) {
    const hashNumbers = new Set<number>();
    visit(
        tree,
        (nodes) => {
            const parsed = parseMacroSubstitutions(nodes);
            parsed.forEach((node) => {
                if (node.type === "hash_number") {
                    hashNumbers.add(node.number);
                }
            });
            nodes.length = 0;
            nodes.push(...(parsed as Ast.Node[]));
        },
        {
            includeArrays: true,
            test: Array.isArray,
        }
    );
    return hashNumbers;
}
