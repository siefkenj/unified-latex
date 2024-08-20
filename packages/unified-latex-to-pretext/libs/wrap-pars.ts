import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { splitForPars } from "./split-for-pars";

/**
 * Wrap paragraphs in `<p>...</p>` tags.
 *
 * Paragraphs are inserted at
 *   * parbreak tokens
 *   * macros listed in `macrosThatBreakPars`
 *   * environments not listed in `environmentsThatDontBreakPars`
 */
export function wrapPars(
    nodes: Ast.Node[],
    options?: {
        macrosThatBreakPars?: string[];
        environmentsThatDontBreakPars?: string[];
    }
): Ast.Node[] {
    const {
        macrosThatBreakPars = [
            "part",
            "chapter",
            "section",
            "subsection",
            "subsubsection",
            "paragraph",
            "subparagraph",
            "vspace",
            "smallskip",
            "medskip",
            "bigskip",
            "hfill",
        ],
        environmentsThatDontBreakPars = [],
    } = options || {};

    const parSplits = splitForPars(nodes, {
        macrosThatBreakPars,
        environmentsThatDontBreakPars,
    });

    return parSplits.flatMap((part) => {
        if (part.wrapInPar) {
            return htmlLike({ tag: "p", content: part.content });
        } else {
            return part.content;
        }
    });
}
