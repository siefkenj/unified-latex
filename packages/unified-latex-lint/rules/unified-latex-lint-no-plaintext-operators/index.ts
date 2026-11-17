import { pointStart, pointEnd } from "unist-util-position";
import { lintRule } from "unified-lint-rule";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { prefixMatch, Trie } from "@unified-latex/unified-latex-util-scan";
import { visit } from "@unified-latex/unified-latex-util-visit";

const OPERATOR_NAMES = [
    "Pr",
    "arccos",
    "arcctg",
    "arcsin",
    "arctan",
    "arctg",
    "arg",
    "argmax",
    "argmin",
    "ch",
    "cos",
    "cosec",
    "cosh",
    "cot",
    "cotg",
    "coth",
    "csc",
    "ctg",
    "cth",
    "deg",
    "det",
    "dim",
    "exp",
    "gcd",
    "hom",
    "inf",
    "injlim",
    "ker",
    "lg",
    "lim",
    "liminf",
    "limsup",
    "ln",
    "log",
    "max",
    "min",
    "plim",
    "projlim",
    "sec",
    "sh",
    "sin",
    "sinh",
    "sup",
    "tan",
    "tanh",
    "tg",
    "th",
    "varinjlim",
    "varliminf",
    "varlimsup",
    "varprojlim",
];

// Use a prefix-tree (Trie) to store the operators for quick lookup.
// We put a `$` at the end of each word because the implementation used only
// returns prefixes and we need to know when we've matched an entire word.
// `$` should never be a string in math mode.
const prefixTree = Trie(OPERATOR_NAMES);

/**
 * If the sequence starting at `pos` is a sequence of single character strings
 * matching one of the `OPERATOR_NAMES`, then the matching operator name is returned.
 * Otherwise `null` is returned.
 */
function matchesAtPos(
    nodes: Ast.Node[],
    index: number
): ReturnType<typeof prefixMatch> {
    // We don't match words that are in the middle of other letters.
    // E.g. the `sin` in "lsinl" is not recognized, but the `sin` in "l sin l" would be.
    const prevNode = nodes[index - 1];
    if (match.string(prevNode) && prevNode.content.match(/^[a-zA-Z]/)) {
        return null;
    }

    const matched = prefixMatch(nodes, prefixTree, {
        startIndex: index,
        // In math mode, all string nodes should be single characters. If they're
        // not, we have mangled them via some other process and the shouldn't be treated
        // normally
        assumeOneCharStrings: true,
    });

    if (!matched) {
        return null;
    }

    // Make sure the next node is not a letter.
    const nextNode = nodes[matched.endNodeIndex + 1];
    if (match.string(nextNode) && nextNode.content.match(/^[a-zA-Z]/)) {
        return null;
    }

    return matched;
}

/**
 * Macros whose arguments are operator names, so nothing inside them is plaintext.
 */
const isOperatorMacro = match.createMacroMatcher(["operatorname", "mathop"]);

/**
 * Font macros that set letters as a word (e.g. `\mathrm{sin}`), unlike `\mathnormal`, which
 * sets them like plain math.
 */
const isWordFontMacro = match.createMacroMatcher([
    "mathrm",
    "mathit",
    "mathbf",
    "mathsf",
    "mathtt",
]);

/**
 * Font switches that set the rest of their group as a word (e.g. `{\rm sin}`).
 */
const isWordFontSwitch = match.createMacroMatcher([
    "rm",
    "it",
    "bf",
    "sf",
    "tt",
]);

/**
 * Spacing macros that may be part of a word (e.g. `\mathrm{arg\,max}`).
 */
const isSpacingMacro = match.createMacroMatcher([
    ",",
    ":",
    ";",
    "!",
    " ",
    "quad",
    "qquad",
]);

/**
 * Whether `nodes` are only letters, whitespace and spacing.
 */
function isWord(nodes: Ast.Node[]): boolean {
    return nodes.every(
        (node) =>
            match.whitespace(node) ||
            isSpacingMacro(node) ||
            (match.anyString(node) && /^[a-zA-Z]+$/.test(node.content))
    );
}

/**
 * Whether `nodes` are deliberately set as a word: they are inside the argument of an operator
 * macro, or they are the whole argument of a font macro and are a word.
 */
function isSetAsWord(
    nodes: Ast.Node[],
    parents: readonly (Ast.Node | Ast.Argument)[]
): boolean {
    if (parents.some((node) => isOperatorMacro(node))) {
        return true;
    }
    const [arg, macro] = parents;
    return arg?.type === "argument" && isWordFontMacro(macro) && isWord(nodes);
}

/**
 * The groups in `nodes` that may be arguments of macros whose arguments aren't known (and so
 * weren't attached), e.g. the `{sin}` in `\myop{sin}`. They may not be in math mode.
 */
function possibleArguments(nodes: Ast.Node[]): Ast.Group[] {
    const groups: Ast.Group[] = [];
    let afterUnknownMacro = false;
    for (const node of nodes) {
        if (match.anyMacro(node)) {
            afterUnknownMacro = node.args == null;
        } else if (match.group(node)) {
            if (afterUnknownMacro) {
                groups.push(node);
            }
        } else if (!match.whitespace(node) && !match.comment(node)) {
            afterUnknownMacro = false;
        }
    }
    return groups;
}

type PluginOptions = { fix?: boolean } | undefined;

export const DESCRIPTION = `## Lint Rule

Avoid writing operators in plaintext. For example, instead of \`$sin(2)$\` write \`$\\sin(2)$\`.

### See

ChkTeX Warning 35
`;

export const unifiedLatexLintNoPlaintextOperators = lintRule<
    Ast.Root,
    PluginOptions
>(
    { origin: "unified-latex-lint:no-plaintext-operators" },
    (tree, file, options) => {
        const possibleArgs = new Set<Ast.Node | Ast.Argument>();
        visit(
            tree,
            (nodes, info) => {
                if (!info.context.inMathMode) {
                    return;
                }
                for (const group of possibleArguments(nodes)) {
                    possibleArgs.add(group);
                }
                // E.g. `\operatorname{sin}` or `\mathrm{sin}` are already set as words, and
                // `\myop{sin}` may be too
                if (
                    isSetAsWord(nodes, info.parents) ||
                    info.parents.some((node) => possibleArgs.has(node))
                ) {
                    return;
                }

                for (let i = 0; i < nodes.length; i++) {
                    // E.g. `{\rm sin}` is set as a word
                    if (
                        isWordFontSwitch(nodes[i]) &&
                        isWord(nodes.slice(i + 1))
                    ) {
                        break;
                    }
                    const matched = matchesAtPos(nodes, i);
                    if (matched) {
                        file.message(
                            `Use "\\${matched.match}" instead of the string "${matched.match}" to specify an operator name in math mode`,
                            {
                                start: pointStart(nodes[i]),
                                end: pointEnd(nodes[matched.endNodeIndex]),
                            }
                        );

                        if (options?.fix) {
                            nodes.splice(i, matched.endNodeIndex - i + 1, {
                                type: "macro",
                                content: matched.match,
                            });
                            // Skip the next index since it's a macro now it doesn't need to be checked
                            i++;
                        }
                    }
                }
            },
            { test: Array.isArray, includeArrays: true }
        );
    }
);
