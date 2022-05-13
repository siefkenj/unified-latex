import { lintRule } from "unified-lint-rule";
import * as Ast from "../../../unified-latex-types";
import { match } from "../../../unified-latex-util-match";
import { visit } from "../../../unified-latex-util-visit";

type PluginOptions = undefined;

export const DESCRIPTION = `## Lint Rule

Avoid using TeX display math command \`$$...$$\`. Instead prefer \`\\[...\\] \`.

When printing processed latex, \`$$...$$\` is automatically replaced with \`\\[...\\] \`.

### See

CTAN l2tabuen Section 1.7`;

export const unifiedLatexLintNoTexDisplayMath = lintRule<
    Ast.Root,
    PluginOptions
>({ origin: "unified-latex-lint:no-tex-display-math" }, (tree, file, options) => {
    visit(
        tree,
        (node) => {
            if (node.type !== "displaymath" || node.position == null) {
                return;
            }
            if (
                file.value.slice(
                    node.position.start.offset,
                    node.position.start.offset + 2
                ) === "$$"
            ) {
                file.message(
                    `Avoid using $$..$$ for display math; prefer \\[..\\]`,
                    node
                );
            }
        },
        { test: match.math }
    );
});
