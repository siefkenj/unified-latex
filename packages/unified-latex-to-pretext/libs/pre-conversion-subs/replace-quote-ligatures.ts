import * as Ast from "@unified-latex/unified-latex-types";
import { arg, m } from "@unified-latex/unified-latex-builder";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";

function isStr(node: Ast.Node | undefined, content: string): boolean {
    return (
        !!node &&
        node.type === "string" &&
        (node as Ast.String).content === content
    );
}

function isLetter(node: Ast.Node | undefined): boolean {
    if (!node || node.type !== "string") return false;
    return /^[a-zA-Z]/.test((node as Ast.String).content);
}

type QuoteKind = "double" | "single";

interface OpenEntry {
    kind: QuoteKind;
    /** Index in the output result array where content for this quote starts. */
    startIndex: number;
}

/**
 * Scan `nodes` for LaTeX quote ligatures and replace matched pairs with macros:
 *   ``...''  →  \enquote{...}   (double quotes, unambiguous)
 *   `...'    →  \sq{...}        (single quotes, with disambiguation)
 *
 * Single-quote disambiguation: a `'` is treated as a closing single-quote only
 * when (a) there is an open `` ` `` on the stack AND (b) it is NOT immediately
 * followed by a letter (to preserve contractions like "don't" and "it's").
 *
 * Nesting is handled correctly: double-quote pairs may contain single-quote
 * pairs and vice-versa.
 *
 * Matching never spans parbreak nodes.
 */
function processQuotes(nodes: Ast.Node[]): Ast.Node[] {
    const result: Ast.Node[] = [];
    const stack: OpenEntry[] = [];
    let i = 0;

    while (i < nodes.length) {
        const node = nodes[i];
        const next = nodes[i + 1];

        // Never match across paragraph breaks — flush any open stack entries
        if (match.parbreak(node)) {
            // Abandon any unmatched openers: splice their raw tokens back
            while (stack.length > 0) {
                // Nothing to do — the raw tokens were already pushed to result
                // (we push openers as raw nodes first, then retroactively replace)
                stack.pop();
            }
            result.push(node);
            i++;
            continue;
        }

        // Detect `` (two backticks) — open double-quote
        if (isStr(node, "`") && next && isStr(next, "`")) {
            stack.push({ kind: "double", startIndex: result.length });
            // Push sentinel placeholders so we know the range if unmatched
            result.push(node, next);
            i += 2;
            continue;
        }

        // Detect '' (two apostrophes) — close double-quote
        if (isStr(node, "'") && next && isStr(next, "'")) {
            // Find the most recent double-quote opener
            const idx = findLastOf(stack, "double");
            if (idx !== -1) {
                const entry = stack.splice(idx, 1)[0];
                // Extract the inner content (everything pushed after the opener's sentinels)
                const inner = result.splice(entry.startIndex);
                // The first two items are the sentinel backticks — remove them
                inner.splice(0, 2);
                // Recursively process single quotes inside the extracted inner content
                const processedInner = processQuotes(inner);
                result.push(
                    m("enquote", [arg(processedInner, { braces: "{}" })])
                );
                i += 2;
                continue;
            }
            // Unmatched — emit as-is
            result.push(node, next);
            i += 2;
            continue;
        }

        // Detect ` (single backtick) — open single-quote
        if (isStr(node, "`") && !(next && isStr(next, "`"))) {
            stack.push({ kind: "single", startIndex: result.length });
            result.push(node); // sentinel
            i++;
            continue;
        }

        // Detect ' (single apostrophe) — potential close single-quote
        if (isStr(node, "'") && !(next && isStr(next, "'"))) {
            // Only close if: (a) there's an open single-quote, AND
            //               (b) the next node is NOT a letter (avoid contractions)
            const idx = findLastOf(stack, "single");
            if (idx !== -1 && !isLetter(nodes[i + 1])) {
                const entry = stack.splice(idx, 1)[0];
                const inner = result.splice(entry.startIndex);
                inner.splice(0, 1); // remove sentinel backtick
                const processedInner = processQuotes(inner);
                result.push(
                    m("sq", [arg(processedInner, { braces: "{}" })])
                );
                i++;
                continue;
            }
            // Unmatched or contraction — emit as-is
            result.push(node);
            i++;
            continue;
        }

        result.push(node);
        i++;
    }

    return result;
}

function findLastOf(stack: OpenEntry[], kind: QuoteKind): number {
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].kind === kind) return i;
    }
    return -1;
}

/**
 * After quote matching, convert any remaining raw ligature string nodes
 * (dashes, tilde, unmatched quotes) directly to ASCII string nodes so that
 * `expandUnicodeLigatures` never has a chance to emit non-ASCII Unicode characters.
 */
function cleanupLigatures(nodes: Ast.Node[]): Ast.Node[] {
    const result: Ast.Node[] = [];
    let i = 0;
    while (i < nodes.length) {
        const node = nodes[i];
        const next = nodes[i + 1];
        const next2 = nodes[i + 2];

        // --- → m() mdash PreTeXt element
        if (isStr(node, "-") && isStr(next, "-") && isStr(next2, "-")) {
            result.push(m("mdash"));
            i += 3;
            continue;
        }
        // -- → ndash PreTeXt element
        if (isStr(node, "-") && isStr(next, "-")) {
            result.push(m("ndash"));
            i += 2;
            continue;
        }
        // ~ → nbsp PreTeXt element
        if (isStr(node, "~")) {
            result.push(m("nbsp"));
            i++;
            continue;
        }
        // All unmatched/lone quote chars → plain ASCII (apostrophe, backtick, quotes)
        if (isStr(node, "'") || isStr(node, "`")) {
            result.push(node); // keep as-is; expandUnicodeLigatures won't see these again
            i++;
            continue;
        }

        result.push(node);
        i++;
    }
    return result;
}

/**
 * Replace LaTeX quote ligatures (`` `` ``...``''`` and `` ` ``...``'``) with
 * `\enquote{...}` and `\sq{...}` macros, and convert dash/tilde ligatures to
 * their PreTeXt macro equivalents, throughout the AST (text mode only).
 *
 * This must run BEFORE the main macro-replacement pass so that the resulting
 * macros are converted to PreTeXt elements by the normal pipeline, preventing
 * `expandUnicodeLigatures` from emitting non-ASCII Unicode characters.
 */
export function replaceQuoteLigatures(ast: Ast.Ast): void {
    visit(
        ast,
        (nodes, info) => {
            if (info.context.inMathMode || info.context.hasMathModeAncestor) {
                return;
            }
            const replaced = cleanupLigatures(processQuotes(nodes));
            nodes.length = 0;
            nodes.push(...replaced);
        },
        { includeArrays: true, test: Array.isArray }
    );
}
