import { pointStart, pointEnd } from "unist-util-position";
import { lintRule } from "unified-lint-rule";
import * as Ast from "@unified-latex/unified-latex-types";
import { match} from "@unified-latex/unified-latex-util-match";
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
        visit(
            tree,
            (nodes, info) => {
                if (!info.context.inMathMode) {
                    return;
                }

                for (let i = 0; i < nodes.length; i++) {
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
