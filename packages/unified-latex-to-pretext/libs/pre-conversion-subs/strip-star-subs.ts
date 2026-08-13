import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Strip a trailing "*" from environment names (e.g. `theorem*` -> `theorem`,
 * `exercises*` -> `exercises`). LaTeX authors star an environment to suppress
 * numbering or tweak spacing; PreTeXt controls numbering itself, so the star
 * carries nothing we need — we just want the same tag as the unstarred form.
 *
 * Math-mode environments (`align*`, `equation*`, `gather*`, ...) are left
 * alone: they're already registered as distinct starred/unstarred pairs
 * (see the `mathtools` CTAN package) and their content is passed through to
 * KaTeX/MathJax as raw source, where the star still matters.
 *
 * Division macros (`\section*`, `\chapter*`, ...) don't need similar
 * treatment here: their signatures already parse the star into its own
 * (unused) argument, so it's effectively ignored already.
 *
 * Must run before macro/environment arguments are attached and before
 * environments are matched against `environmentReplacements`, so that a
 * starred environment is treated identically to its unstarred form
 * throughout the rest of the pipeline.
 */
export function stripStarredEnvironments(ast: Ast.Ast): void {
    visit(ast, (node) => {
        if (!match.anyEnvironment(node)) {
            return;
        }
        if (node._renderInfo?.inMathMode) {
            return;
        }
        if (node.env.endsWith("*")) {
            node.env = node.env.slice(0, -1);
        }
    });
}
