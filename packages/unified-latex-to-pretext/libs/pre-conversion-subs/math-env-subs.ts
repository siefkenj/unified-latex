import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { getEnvName } from "./utils";

/**
 * Display-math environments that the parser fails to recognize as math, and
 * hands back as plain `environment` nodes.
 *
 * The `math_env_name` rule in `latex.pegjs` is a PEG *ordered choice* listing
 * `"align*" / "align" / "alignat*" / "alignat"`. Because `align` matches a
 * prefix of `alignat`, the rule commits to `align`, then fails on the leftover
 * `at` and backtracks out of the alternation entirely -- the `alignat`
 * alternatives are unreachable. `eqnarray` is simply absent from that list.
 *
 * Both are grammar bugs, but the grammar is shared with `unified-latex-to-hast`
 * and every other consumer, so rather than patch it we retag the nodes here.
 * Retagging (as opposed to special-casing them downstream) is what makes the
 * rest of the pipeline leave their contents alone: `listMathChildren` reports
 * `content` as math-entering for a `mathenv`, which is what sets
 * `hasMathModeAncestor` and thus stops macro/environment replacement from
 * rewriting math internals.
 */
const UNRECOGNIZED_MATH_ENVIRONMENTS = new Set([
    "alignat",
    "alignat*",
    "eqnarray",
    "eqnarray*",
]);

/**
 * Retag display-math environments the parser mis-typed as text-mode
 * environments (see `UNRECOGNIZED_MATH_ENVIRONMENTS`).
 *
 * Must run before `stripStarredEnvironments`, which would otherwise strip the
 * `*` from `eqnarray*` -- it has no `_renderInfo.inMathMode` to protect it --
 * and silently turn an unnumbered display into a numbered one.
 */
export function normalizeMathEnvironments(ast: Ast.Ast): void {
    visit(ast, (node) => {
        if (!match.anyEnvironment(node) || node.type === "mathenv") {
            return;
        }
        if (!UNRECOGNIZED_MATH_ENVIRONMENTS.has(getEnvName(node.env))) {
            return;
        }
        node.type = "mathenv";
        node._renderInfo = { ...node._renderInfo, inMathMode: true };
    });
}
