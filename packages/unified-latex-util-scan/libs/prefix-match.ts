import Trie from "trie-prefix-tree";
import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";

export { Trie };

/**
 * Efficiently search for a large number of strings using a prefix-tree.
 * The longest match is returned.
 *
 * @param options.startIndex the index to start scanning at. Defaults to 0.
 * @param options.matchSubstrings whether to allow matching only part of a substring.
 * @param options.assumeOneCharStrings assume that all strings are one character long (for example, like they are in math mode)
 */
export function prefixMatch(
    nodes: Ast.Node[],
    prefixes: string | string[] | ReturnType<typeof Trie>,
    options?: {
        startIndex?: number;
        matchSubstrings?: boolean;
        assumeOneCharStrings?: boolean;
    }
): {
    match: string;
    endNodeIndex: number;
    endNodePartialMatch: string | null;
} | null {
    const {
        startIndex = 0,
        matchSubstrings = false,
        assumeOneCharStrings = false,
    } = options || {};

    if (typeof prefixes === "string") {
        prefixes = [prefixes];
    }
    if (Array.isArray(prefixes)) {
        prefixes = Trie(prefixes);
    }
    const prefixTree = prefixes;

    const history = {
        lastPrefix: "",
        lastWord: "",
        index: startIndex,
        partialMatch: "",
    };

    /**
     * Try to match the next character. If it matches,
     * record it properly in the `history` object.
     */
    function tryToMatchNextChar(char: string, index: number): boolean {
        let ret = false;
        if (prefixTree.isPrefix(history.lastPrefix + char)) {
            history.lastPrefix += char;
            history.index = index;
            ret = true;
        }
        if (prefixTree.hasWord(history.lastPrefix)) {
            history.lastWord = history.lastPrefix;
        }
        return ret;
    }

    // Loop through the nodes looking for the longest prefix match
    for (let i = 0; startIndex + i < nodes.length; i++) {
        const node = nodes[startIndex + i];
        if (!match.string(node)) {
            break;
        }
        if (assumeOneCharStrings && node.content.length !== 1) {
            break;
        }
        if (matchSubstrings) {
            // We need to test letter-by-letter for substring matches
            let fullMatch = true;
            history.partialMatch = "";
            for (let j = 0; j < node.content.length; j++) {
                const char = node.content[j];
                if (tryToMatchNextChar(char, startIndex + i)) {
                    history.partialMatch += char;
                } else {
                    fullMatch = false;
                    break;
                }
            }
            if (fullMatch) {
                history.partialMatch = "";
            } else {
                break;
            }
        } else {
            if (!tryToMatchNextChar(node.content, startIndex + i)) {
                break;
            }
        }
    }

    return history.lastWord
        ? {
              match: history.lastWord,
              endNodeIndex: history.index,
              endNodePartialMatch: history.partialMatch
                  ? history.partialMatch
                  : null,
          }
        : null;
}
