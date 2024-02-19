/**
 * This example shows how expand or replace macros.
 */
import { unified, Plugin } from "unified";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import {
    expandMacrosExcludingDefinitions,
    listNewcommands,
} from "@unified-latex/unified-latex-util-macros";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import * as Ast from "@unified-latex/unified-latex-types";
import { unifiedLatexStringCompiler } from "@unified-latex/unified-latex-util-to-string";

const TEX_SOURCE = String.raw`
\newcommand{\abc}[1]{ABC}
My \textbf{custom} \abc{macro}.
`;

/**
 * Replacing macros with `replaceNode`
 */

// A common task is to replace a macro with some other content. One way to do this is with `replaceNode`.

const processor1 = unified().use(unifiedLatexFromString, {
    // Parse `\abc` as taking a mandatory argument.
    macros: { abc: { signature: "m" } },
});
const ast1 = processor1.parse(TEX_SOURCE);
// Prints: `\newcommand{\abc}[1]{ABC} My \textbf{custom} \abc{macro}.`
console.log(printRaw(ast1));

replaceNode(ast1, (node) => {
    if (match.macro(node, "newcommand")) {
        // Remove any `\newcommand` macros from the tree.
        return null;
    }
    if (match.macro(node, "abc")) {
        // Replace `\abc` with `ABC`.
        return { type: "string", content: "ABC" };
    }
});
// Prints: ` My \textbf{custom} ABC.`
console.log(printRaw(ast1));

/**
 * Replacing macros only in math mode
 */

// Using the `info` object, you can get extra information about context before replacing a node.
const ast2 = processor1.parse(String.raw`\abc{fun} $x=\abc{times}$`);
replaceNode(ast2, (node, info) => {
    if (info.context.inMathMode && match.macro(node, "abc")) {
        // Replace `\abc` with `ABC` only in math mode.
        return { type: "string", content: "ABC" };
    }
});
// Prints: `\abc{fun} $x=ABC$`
console.log(printRaw(ast2));

/**
 * Replacing during `visit`
 */

// `replaceNode` is really just a wrapper around `visit`. You can use `visit` directly to replace nodes.
const ast3 = processor1.parse(TEX_SOURCE);
visit(ast3, (node, info) => {
    if (match.macro(node, "newcommand")) {
        // Replace `\newcommand` with the empty string.
        // `replaceNode` actually _removes_ nodes from the tree, which we could do too,
        // but it would involve quite a bit more work.

        // We are directly manipulating a node and changing its type,
        // TypeScript doesn't like this, so we have to do some casting.
        node = node as unknown as Ast.String;
        node.type = "string";
        node.content = "";
    }
    if (match.macro(node, "abc")) {
        // Replace `\abc` with `ABC`.

        // We are directly manipulating a node and changing its type,
        // TypeScript doesn't like this, so we have to do some casting.
        node = node as unknown as Ast.String;
        node.type = "string";
        node.content = "ABC";
    }
});
// Prints: ` My \textbf{custom} ABC.`
console.log(printRaw(ast3));

/**
 * Expanding `\newcommand` directly
 */

// We can expand macros defined via `\newcommand`, `\NewDocumentCommand`, etc. by creating a plugin.

/**
 * Plugin that expands the specified macros by name. These macros must be defined in the document via
 * `\newcommand...` or equivalent.
 */
export const expandDocumentMacrosPlugin: Plugin<void[], Ast.Root, Ast.Root> =
    function () {
        return (tree) => {
            const newcommands = listNewcommands(tree);

            const macroInfo = Object.fromEntries(
                newcommands.map((m) => [m.name, { signature: m.signature }])
            );
            // We need to attach the arguments to each macro before we process it!
            attachMacroArgs(tree, macroInfo);
            // We want to expand all macros, except ones mentioned in actual `\newcommand` commands.
            expandMacrosExcludingDefinitions(tree, newcommands);

            // Finally, let's remove the `\newcommand`s from the tree.
            // Our document could have used `\newcommand` or `\NewDocumentCommand`, etc. We will remove
            // all of these.
            const newcommandsUsed = Object.fromEntries(
                newcommands.map((x) => [x.definition.content, true])
            );
            replaceNode(tree, (node) => {
                if (match.anyMacro(node) && newcommandsUsed[node.content]) {
                    return null;
                }
            });
        };
    };

const processor4 = unified()
    .use(unifiedLatexFromString)
    .use(expandDocumentMacrosPlugin)
    .use(unifiedLatexStringCompiler, { pretty: true });
const processed4 = processor4.processSync(TEX_SOURCE);
// Prints: ` My \textbf{custom} ABC.`
console.log(String(processed4));
