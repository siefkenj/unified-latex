import { lintRule } from "unified-lint-rule";
import * as Ast from "../../../unified-latex-types";
import { match } from "../../../unified-latex-util-match";
import { visit } from "../../../unified-latex-util-visit";

type PluginOptions = { preferredStyle: "tex" | "latex" } | undefined;

export const DESCRIPTION = `## Lint Rule

Avoid mixing TeX-style inline math \`$...$\` with LaTeX-style \`\\(...\\)\` inline math.
`;

export const unifiedLatexLintConsistentInlineMath = lintRule<
    Ast.Root,
    PluginOptions
>({ origin: "unified-latex-lint:consistent-inline-math" }, (tree, file, options) => {
    const inlineMath: Record<"tex" | "latex", Ast.Node[]> = {
        tex: [],
        latex: [],
    };

    visit(
        tree,
        (node) => {
            if (node.type !== "inlinemath" || node.position == null) {
                return;
            }
            if (
                file.value.slice(
                    node.position.start.offset,
                    node.position.start.offset + 1
                ) === "$"
            ) {
                inlineMath.tex.push(node);
            } else {
                inlineMath.latex.push(node);
            }
        },
        { test: match.math }
    );

    if (options?.preferredStyle) {
        // If a preferred style is specified, we only check for things not matching the preferred style.
        if (options.preferredStyle === "tex") {
            for (const node of inlineMath.latex) {
                file.message(
                    `Prefer TeX-style $...$ inline math to LaTeX-style \\(...\\)`,
                    node
                );
            }
        }
        if (options.preferredStyle === "latex") {
            for (const node of inlineMath.latex) {
                file.message(
                    `Prefer LaTeX-style \\(...\\) inline math to LaTeX-style $...$`,
                    node
                );
            }
        }
    } else {
        // If there's not preferred style, we prefer the most commonly used style of the document
        const numTex = inlineMath.tex.length;
        const numLatex = inlineMath.latex.length;
        if (numTex > 0 && numLatex > 0) {
            if (numLatex > numTex) {
                for (const node of inlineMath.tex) {
                    file.message(
                        `Inconsistent inline-math style. This document uses LaTeX-style \\(...\\) inline math more than TeX-style $...$ inline math`,
                        node
                    );
                }
            } else {
                for (const node of inlineMath.latex) {
                    file.message(
                        `Inconsistent inline-math style. This document uses TeX-style $...$ inline math more than LaTeX-style \\(...\\) inline math`,
                        node
                    );
                }
            }
        }
    }
});
