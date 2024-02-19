/**
 * This example shows how ignore all default parsing and use exclusively custom macros.
 */
import { unified } from "unified";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromStringMinimal,
    unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse,
} from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { macros as xcolorMacros } from "@unified-latex/unified-latex-ctan/package/xcolor";
import { Root } from "@unified-latex/unified-latex-types";

const TEX_SOURCE = String.raw`
My \textbf{custom} \abc{macro}.
`;

// The default parser for `unified-latex` recognizes macros coming from several packages (those listed in `unified-latex-ctan/package`),
// but your use case may involve only custom macros (or you may want the speed boost of not processing many macros).
// Parsing with `unifiedLatexFromStringMinimal` parses a string into its "most abstract" form, where no macro arguments are attached.
// This means that a string like `\textbf{foo}` will be parsed as the macro `\textbf` followed by the group containing `foo`.

// Parser with defaults
const processor1 = unified().use(unifiedLatexFromStringMinimal);
const ast1 = processor1.parse(TEX_SOURCE);
// Prints `\textbf \abc`. Notice how `\xxx` is at position 3 (instead of 2 like in `custom-macros.ts`).
// This is because `unifiedLatexFromStringMinimal` doesn't trim any leading or trailing whitespace.
console.log(printRaw(ast1.content[3]), printRaw(ast1.content[6]));

// You may want to process a string as if it were in math mode. This can be done by setting `mode: "math"` in the parser options.
const processor2 = unified().use(unifiedLatexFromStringMinimal, {
    mode: "math",
});
const ast2 = processor2.parse(`x^2`);
// Prints `^`.
console.log(printRaw(ast2.content[1]));

/**
 * Using specific packages
 */

// We can build a parsing pipeline that only recognizes macros from specific packages.
const processor3 = unified()
    .use(unifiedLatexFromStringMinimal)
    // We could manually use `attachMacroArgs` and write a custom plugin,
    // but the `unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse` is already here for us.
    // It will also reparse the content of custom "math" environments so their content is in math mode.
    // (Ths is how `\begin{equation}...\end{equation}` end up with their contents parsed in math mode.)
    .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
        // Only process macros from the `xcolor` package.
        macros: xcolorMacros,
        environments: {},
    })
    .use(unifiedLatexAstComplier);
const processed3 = processor3.processSync(String.raw`\color{blue}\textbf{foo}`)
    .result as Root;
// Print the parsed AST with a space between each node.
// Prints `\color{blue} \textbf {foo}`.
console.log(processed3.content.map((c) => printRaw(c)).join(" "));
