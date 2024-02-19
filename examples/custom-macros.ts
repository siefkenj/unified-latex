/**
 * This example shows how include your own macros for parsing.
 */
import { unified } from "unified";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

const TEX_SOURCE = String.raw`
My \textbf{custom} \abc{macro}.
`;

// The default parser for `unified-latex` recognizes macros coming from several packages (those listed in `unified-latex-ctan/package`),
// but you may want to add your own macros to the parsing pipeline.

// Parser with defaults
const processor1 = unified().use(unifiedLatexFromString);
const ast1 = processor1.parse(TEX_SOURCE);
// Prints `\textbf{custom} \abc`. Notice how the argument of `\xxx` is not included.
console.log(printRaw(ast1.content[2]), printRaw(ast1.content[4]));

/**
 * Adding a custom macro specification
 */

// We can pass in custom macro (and environment) specifications to the parser.
const processor2 = unified().use(unifiedLatexFromString, {
    // We define the macro `\abc` to take one mandatory argument. The `signature` is specified
    // using the syntax of the `xparse` package: https://ctan.org/pkg/xparse
    macros: { abc: { signature: "m" } },
});
const ast2 = processor2.parse(TEX_SOURCE);
// Prints `\textbf{custom} \abc{macro}`. Notice how the argument of `\abc` is included.
console.log(printRaw(ast2.content[2]), printRaw(ast2.content[4]));

// Any specification you add take precedence over the built in ones.
const processor3 = unified().use(unifiedLatexFromString, {
    macros: { textbf: { signature: "" }, abc: { signature: "m" } },
});
const ast3 = processor3.parse(TEX_SOURCE);
// Prints `\textbf \abc{macro}`.
// Notice how the argument of `\textbf` is not included. Te index of `\abc` also changed
// because there are additional nodes (since `\textbf` didn't take its argument).
console.log(
    printRaw(ast3.content[2]),
    printRaw(ast3.content[5]),
    printRaw(ast3.content[4])
);
