import { structuredClone } from "@unified-latex/structured-clone";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
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
    substitution: Ast.Node[]
): (macro: Ast.Macro) => Ast.Node[] {
    const cachedSubstitutionTree = structuredClone(substitution);
    let hasSubstitutions = false;
    visit(
        cachedSubstitutionTree,
        (nodes) => {
            const parsed = parseMacroSubstitutions(nodes);
            // Keep track of whether there are any substitutions so we can bail early if not.
            hasSubstitutions =
                hasSubstitutions ||
                parsed.some((node) => node.type === "hash_number");
            nodes.length = 0;
            nodes.push(...(parsed as Ast.Node[]));
        },
        {
            includeArrays: true,
            test: Array.isArray,
        }
    );

    return (macro: Ast.Macro) => {
        if (!hasSubstitutions) {
            return cachedSubstitutionTree;
        }
        const cachedSubstitutions = (macro.args || []).map(
            (arg) => arg.content
        );
        function getSubstitutionForHashNumber(hashNumber: HashNumber) {
            return (
                cachedSubstitutions[hashNumber.number - 1] || {
                    type: "string",
                    content: `#${hashNumber.number}`,
                }
            );
        }
        const retTree = structuredClone(cachedSubstitutionTree);
        replaceNode(retTree, (node) => {
            const hashNumOrNode = node as Ast.Node | HashNumber;
            if (hashNumOrNode.type !== "hash_number") {
                return;
            }
            return getSubstitutionForHashNumber(hashNumOrNode);
        });
        return retTree;
    };
}
