import { structuredClone } from "@unified-latex/structured-clone";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { parseMinimal } from "@unified-latex/unified-latex-util-parse";
import {
    HashNumber,
    parseMacroSubstitutions,
} from "./parse-macro-substitutions";

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
            sigOptionalArg = [`O{${printRaw(namedArgs.default)}}`];
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

type ExpanderArg = {
    content: Ast.Node[];
    /**
     * The hash numbers that are used in this argument.
     */
    hashNumbers: number[];
};

/**
 * A macro can have arguments `#1`...`#9`. This function returns an array of
 * `Ast.Node` that can be used as the default arguments for a macro if none are provided.
 */
function defaultExpanderArgs(): ExpanderArg[] {
    return Array.from({ length: 10 }).map((_, i) => ({
        hashNumbers: [],
        content: [{ type: "string", content: `#${i + 1}` }],
    }));
}

/**
 * A factory function. Given a macro definition, creates a function that accepts
 * the macro's arguments and outputs an Ast with the contents substituted (i.e.,
 * it expands the macro).
 */
export function createMacroExpander(
    substitution: Ast.Node[]
): (macro: Ast.Macro) => Ast.Node[] {
    const cachedSubstitutionTree = structuredClone(substitution);
    const hashNumbers = parseHashNumbers(cachedSubstitutionTree);

    return (macro: Ast.Macro) => {
        // We can short-circuit if there are no substitutions to do.
        if (hashNumbers.length === 0) {
            return structuredClone(cachedSubstitutionTree);
        }

        const cachedSubstitutions: ExpanderArg[] = defaultExpanderArgs().map(
            (expanderArg, i) => {
                const number = i + 1;
                if (!hashNumbers.includes(number)) {
                    // If we're here, the hash number `i+1` has not been requested for use in a substitution.
                    // It is safe to return the default (it will never be used)
                    return expanderArg;
                }
                const arg = macro.args?.[i];
                const defaultArg = arg?._renderInfo?.defaultArg;
                if (!arg || (isEmptyArg(arg) && defaultArg != null)) {
                    const content = cachedParse(defaultArg!);
                    const hashNumbers = parseHashNumbers(content);
                    return {
                        content,
                        hashNumbers,
                    };
                }
                return { content: arg.content, hashNumbers: [] };
            }
        );

        // Since we are only allowed `#1`...`#9`, it can take at most 10 iterations to expand in the worst case.
        // If we expand further than that, there is a circular reference.
        let numTimesExpanded = 0;
        while (
            expandCachedSubstitutions(cachedSubstitutions) &&
            numTimesExpanded < cachedSubstitutions.length
        ) {
            numTimesExpanded++;
        }

        // By this point we have expanded substitutions as much as possible.
        // If there are any remaining hash numbers, they come from circular references.
        for (const expanderArg of cachedSubstitutions) {
            if (expanderArg.hashNumbers.length > 0) {
                expanderArg.content = [
                    // `xparse` seems to use `-No Value-` here.
                    { type: "string", content: `-Circular-` },
                ];
            }
        }

        const retTree = structuredClone(cachedSubstitutionTree);
        replaceNode(retTree, (node) => {
            const hashNumOrNode = node as Ast.Node | HashNumber;
            if (hashNumOrNode.type !== "hash_number") {
                return;
            }
            return cachedSubstitutions[hashNumOrNode.number - 1].content;
        });
        return retTree;
    };
}

/**
 * Is the argument empty? This occurs when optional arguments are not provided.
 */
function isEmptyArg(arg: Ast.Argument) {
    return (
        arg.openMark === "" && arg.closeMark === "" && arg.content.length === 0
    );
}

/**
 * Parses `tree` for hash numbers (e.g. `#1` or `##`, etc.). Hash numbers are replaced
 * with a `{type: "hash_number"}` node. This mutates `tree`.
 * @param tree
 * @returns A list containing all hash numbers that were found.
 */
function parseHashNumbers(tree: Ast.Node[]) {
    let hashNumbers = new Set<number>();
    visit(
        tree,
        (nodes) => {
            const parsed = parseMacroSubstitutions(nodes);
            for (const node of parsed) {
                if (node.type === "hash_number") {
                    hashNumbers.add(node.number);
                }
            }
            // Replace the nodes with the parsed version
            nodes.length = 0;
            nodes.push(...(parsed as Ast.Node[]));
        },
        {
            includeArrays: true,
            test: Array.isArray,
        }
    );
    return Array.from(hashNumbers);
}

/**
 * Get a list of all hash numbers referenced within `tree`.
 */
function hashNumbersReferenced(tree: Ast.Node[]) {
    let hashNumbers = new Set<number>();
    visit(tree, (node) => {
        const n = node as any as Ast.Node | HashNumber;
        if (n.type === "hash_number") {
            hashNumbers.add(n.number);
        }
    });
    return Array.from(hashNumbers);
}

const parseCache = new Map<string, Ast.Node[]>();
/**
 * Parse `source` and cache the result. Multiple on the same string will not reparse.
 */
function cachedParse(source: string): Ast.Node[] {
    const cached = parseCache.get(source);
    if (cached) {
        return structuredClone(cached);
    }
    const parsed = parseMinimal(source).content;
    parseCache.set(source, structuredClone(parsed));
    return parsed;
}

/**
 * Perform one step in the expansion of `expanderArgs`. The result may still have `type: "hash_number"` nodes.
 */
function expandCachedSubstitutions(expanderArgs: ExpanderArg[]) {
    let didExpand = false;
    for (const expanderArg of expanderArgs) {
        if (expanderArg.hashNumbers.length === 0) {
            continue;
        }
        replaceNode(expanderArg.content, (node) => {
            const hashNumOrNode = node as Ast.Node | HashNumber;
            if (hashNumOrNode.type !== "hash_number") {
                return;
            }
            didExpand = true;
            return expanderArgs[hashNumOrNode.number - 1].content;
        });
        expanderArg.hashNumbers = hashNumbersReferenced(expanderArg.content);
    }
    return didExpand;
}
