import * as Ast from "../../unified-latex-types";
import { visit } from "../../unified-latex-util-visit";
import { parseLigatures } from "./parse";

/**
 * Turn all ligatures into their unicode equivalent. For example,
 * `---` -> an em-dash and `\^o` to `ô`. This only applies in non-math mode,
 * since programs like katex will process math ligatures.
 */
export function expandUnicodeLigatures(tree: Ast.Ast) {
    visit(
        tree,
        (nodes, info) => {
            // KaTeX/MathJax will process ligatures in math mode. This includes
            // ligatures in `\text{...}` macros inside of math mode. So, avoid
            // processing them in this case.
            if (info.context.inMathMode || info.context.hasMathModeAncestor) {
                return;
            }

            const parsed = parseLigatures(nodes);
            nodes.length = 0;
            nodes.push(...parsed);
        },
        { includeArrays: true, test: Array.isArray }
    );
}
