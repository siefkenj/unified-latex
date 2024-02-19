/**
 * This example shows how to build a parser with the `unified` library.
 */
import { unified } from "unified";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { unifiedLatexStringCompiler } from "@unified-latex/unified-latex-util-to-string";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import type { Root } from "@unified-latex/unified-latex-types";

const TEX_SOURCE = String.raw`
This is \textbf{an} example of a \LaTeX{} document with \textit{some} macros.
\[
    e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}.
\]
What an \textit{\textbf{amazing}} formula!
`;

// The `unified` framework runs in three steps:
//  1. Parse a string to an AST.
//  2. Transform the AST.
//  3. Compile the AST to a final format (normally a string).
// We can interface with `unified` at any of these steps.

/**
 * Basic Parsing
 */

// This processor can only parse (step 1).
const processor1 = unified().use(unifiedLatexFromString);
const ast1 = processor1.parse(TEX_SOURCE);
// Prints `{ type: "macro", content: "textbf", ... }`
console.log(ast1.content[4]);

/**
 * Parsing and Transforming
 */

// We can add a transformer to the processor to transform the AST (step 2).
// These take the form of `unified` plugins.
const processor2 = unified()
    .use(unifiedLatexFromString)
    .use(function transformer() {
        return (ast) => {
            visit(ast, (node) => {
                if (match.macro(node, "textbf")) {
                    // Change all `\textbf` macros into `\emph` macros.
                    node.content = "emph";
                }
            });
        };
    });
// To use the transformer, `processor2` must be called in two steps.
const ast2 = processor2.parse(TEX_SOURCE);
// `processor2.run` executes all the transformer plugins. These operations mutate
// the source.
processor2.run(ast2);
// Prints `{ type: "macro", content: "emph", ... }`
console.log(ast2.content[4]);

/**
 * Parsing, Transforming, and Stringifying
 */

// If we want unified to run all steps together, we need to provide a _compiler_ plugin.
const processor3 = unified()
    .use(unifiedLatexFromString)
    // Same transformer as before.
    .use(function transformer() {
        return (ast) => {
            visit(ast, (node) => {
                if (match.macro(node, "textbf")) {
                    // Change all `\textbf` macros into `\emph` macros.
                    node.content = "emph";
                }
            });
        };
    })
    // When we turn the LaTeX into a string, pretty-print it.
    .use(unifiedLatexStringCompiler, { pretty: true });
const processed3 = processor3.processSync(TEX_SOURCE);
// `processSync` returns a `VFile` object which contains the output string along with
// additional information. Calling `String(...)` ont the `VFile` is the preferred way
// to get the output string.
//
// Prints:
// ```
// This is \emph{an} example of a \LaTeX{} document with \textit{some} macros.
// \[
//         e^{x} = \sum_{n=0}^{\infty}\frac{x^{n}}{n!}.
// \]
// What an \textit{\emph{amazing}} formula!
// ```
console.log(String(processed3));

/**
 * Parsing, Transforming, and _not_ Stringifying
 */

// Sometimes you wan to use the convenience of `processSync` without the overhead.
// Since `processSync` only runs if all three steps are present in your processor,
// `unified-latex` provides a cheat: `unifiedLatexAstComplier` is a compiler plugin
// that doesn't do anything--just returns the AST as it was.
const processor4 = unified()
    .use(unifiedLatexFromString)
    // Same transformer as before.
    .use(function transformer() {
        return (ast) => {
            visit(ast, (node) => {
                if (match.macro(node, "textbf")) {
                    // Change all `\textbf` macros into `\emph` macros.
                    node.content = "emph";
                }
            });
        };
    })
    // This processor won't touch the AST
    .use(unifiedLatexAstComplier);
const processed4 = processor4.processSync(TEX_SOURCE);
// The AST is stored in the `result` prop of the `VFile`.
// Unfortunately, type information is lost here, but we know it's an `Ast.Root`.
const ast4 = processed4.result as Root;
// Prints `{ type: "macro", content: "emph", ... }`
console.log(ast4.content[4]);
