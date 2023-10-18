export * from "./libs/unified-latex-plugin-to-hast";
export * from "./libs/unified-latex-wrap-pars";
export * from "./libs/pre-html-subs/katex-subs";
export * from "./libs/wrap-pars";
export * from "./libs/convert-to-html";

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to convert `unified-latex` Abstract Syntax Tree (AST) to a HAST (html-like)
 * tree.
 *
 * ## When should I use this?
 *
 * If you want to convert LaTeX to HTML.
 *
 * ## Controlling the HTML output
 *
 * This plugin comes with presets for several common LaTeX macros/environments, but you probably want to
 * control how various macros evaluate yourself. For example, you may have used `\includegraphics` with `pdf`s
 * in your LaTeX source by want to output HTML that manipulates the path and includes `png`s instead.
 * You can accomplish this by passing `macroReplacements` (for environments, there is the similarly-named
 *  `environmentReplacements`) to the plugin.
 *
 * For example,
 * ```typescript
 * import { unified } from "unified";
 * import rehypeStringify from "rehype-stringify";
 * import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
 * import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
 * import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
 * import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
 * import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";              
 *
 * const convert = (value) =>
 *     unified()
 *         .use(unifiedLatexFromString)
 *         .use(unifiedLatexToHast, {
 *             macroReplacements: {
 *                 includegraphics: (node) => {
 *                     const args = getArgsContent(node);
 *                     const path = printRaw(
 *                         args[args.length - 1] || []
 *                     ).replace(/\.pdf$/, ".png");
 *                     return htmlLike({
 *                         tag: "img",
 *                         attributes: { src: path },
 *                     });
 *                 },
 *             },
 *         })
 *         .use(rehypeStringify)
 *         .processSync(value).value;
 *
 * console.log(convert(`\\includegraphics{foo.pdf}`));
 * ```
 *
 * `macroReplacements` and `environmentReplacements` functions can return any unified-latex `Node`, but
 * using the `htmlLike` utility function will return nodes that get converted to specific HTML. See `htmlLike`'s
 * documentation for more details.
 */
