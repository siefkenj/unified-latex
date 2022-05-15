import type { Plugin, Printer } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse } from "@unified-latex/unified-latex-util-parse";
import { printLatexAst } from "./printer";

const languages = [
    {
        name: "latex",
        extensions: [".tex"],
        parsers: ["latex-parser"],
    },
];

const parsers = {
    "latex-parser": {
        parse,
        astFormat: "latex-ast",
        locStart: (node: Ast.Node) =>
            node.position ? node.position.start.offset : 0,
        locEnd: (node: Ast.Node) =>
            node.position ? node.position.end.offset : 1,
    },
};

const printers = {
    "latex-ast": {
        print: printLatexAst,
    } as Printer,
};

const prettierPluginLatex: Plugin<Ast.Node> = { languages, parsers, printers };

export { prettierPluginLatex };
