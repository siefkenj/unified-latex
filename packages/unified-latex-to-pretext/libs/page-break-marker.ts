import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Placeholder macro left behind by `hoistPageBreaks` wherever a page break
 * should become a `<page>` boundary inside a worksheet or handout.
 *
 * The `<worksheet>`/`<handout>` element doesn't exist yet when that pass runs --
 * the division form is still a `_worksheet` environment and the exam form is
 * still a `questions` environment -- and the break itself may be buried inside a
 * `\question` body, so the boundary has to ride along in the tree as a node of
 * its own until `splitWorksheetPages` can act on it. Normalizing `\newpage`,
 * `\clearpage`, `\cleardoublepage`, and `\pagebreak[4]` into one marker also
 * means only one thing has to be recognized downstream.
 *
 * `-` can't occur in a macro name parsed from real LaTeX, so this can never
 * collide with an author's macro.
 */
export const PAGE_BREAK_MARKER = "page-break-marker";

export function pageBreakMarker(): Ast.Macro {
    return { type: "macro", content: PAGE_BREAK_MARKER };
}

export function isPageBreakMarker(node: Ast.Node): node is Ast.Macro {
    return match.macro(node, PAGE_BREAK_MARKER);
}

/**
 * Remove any markers `splitWorksheetPages` did not consume.
 *
 * A marker only becomes a `<page>` boundary if the container it sits in really
 * does end up as a `<worksheet>`/`<handout>`, and only if the split produced
 * more than one page (a lone break at the very start or end of a worksheet says
 * nothing about where pages divide). Those markers are dropped, but must not
 * leak into the output.
 */
export function removePageBreakMarkers(tree: Ast.Root): void {
    visit(
        tree,
        (nodes) => {
            for (let i = nodes.length - 1; i >= 0; i--) {
                if (isPageBreakMarker(nodes[i])) {
                    nodes.splice(i, 1);
                }
            }
        },
        { includeArrays: true, test: Array.isArray }
    );
}
