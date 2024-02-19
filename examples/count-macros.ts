/**
 * This example shows how to count macros in a tex string and print out statistics.
 */
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { anyMacro } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

const TEX_SOURCE = String.raw`
This is \textbf{an} example of a \LaTeX{} document with \textit{some} macros.
\[
    e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}.
\]
What an \textit{\textbf{amazing}} formula!
`;

// The quickest way to get started is to create a parser with `getParser`.
const parser = getParser();
const ast = parser.parse(TEX_SOURCE);

const macroInfo: Record<string, string[]> = {};
const mathMacros: string[] = [];

visit(ast, (node, info) => {
    if (!anyMacro(node)) {
        return;
    }
    // If we're here, we are a macro node.
    macroInfo[node.content] = macroInfo[node.content] || [];
    // `printRaw` will print `node` (and its content) without any formatting.
    macroInfo[node.content].push(printRaw(node));

    // `info.context` contains information about where in the parse tree we currently are.
    if (info.context.inMathMode) {
        // Save just the macro "name".
        mathMacros.push(node.content);
    }
});

// Prints
//
// ```
// Macro statistics:
// 
// All macros: {
//   textbf: [ '\\textbf{an}', '\\textbf{amazing}' ],
//   LaTeX: [ '\\LaTeX' ],
//   textit: [ '\\textit{some}', '\\textit{\\textbf{amazing}}' ],
//   '^': [ '^{x}', '^{\\infty}', '^{n}' ],
//   sum: [ '\\sum' ],
//   _: [ '_{n=0}' ],
//   infty: [ '\\infty' ],
//   frac: [ '\\frac{x^{n}}{n!}' ]
// }
// Math mode macros: [ '^', 'sum', '_', '^', 'infty', 'frac', '^' ]
// ```
console.log("Macro statistics:\n");
console.log("All macros:", macroInfo);
console.log("Math mode macros:", mathMacros);
