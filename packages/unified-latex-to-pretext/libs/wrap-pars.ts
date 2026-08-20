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
            "includegraphics",
            "plus",
            "include",
            "title",
            // Beamer frame titles: keep them out of `<p>` so `beamerFrameFactory`
            // can lift them into `<title>`/`<subtitle>` on the slide.
            "frametitle",
            "framesubtitle",
        ],
        // These become PreTeXt `TextParagraphItem`s -- `<ol>`/`<ul>`/`<dl>` --
        // which live inside a `<p>`, so they must not split the paragraph they
        // are part of. See `PARAGRAPH_LEVEL_TAGS` in
        // unified-latex-plugin-to-pretext-like.ts, which makes the same call for
        // the already-converted form of these environments.
        environmentsThatDontBreakPars = [
            "index",
            "itemize",
            "enumerate",
            "description",
        ],
    } = options || {};

    const parSplits = splitForPars(nodes, {
        macrosThatBreakPars,
        environmentsThatDontBreakPars,
    });

    return parSplits.flatMap((part) => {
        if (part.wrapInPar) {
            // `workspace` comes from a `\vspace`/`\vfill`/`\vskip` that followed
            // this paragraph inside a worksheet/handout/project-like environment
            // (see vertical-space-subs.ts). `<p>` is one of the elements PreTeXt
            // lets carry one.
            return htmlLike({
                tag: "p",
                content: part.content,
                attributes: part.workspace
                    ? { workspace: part.workspace }
                    : undefined,
            });
        } else {
            return part.content;
        }
    });
}
