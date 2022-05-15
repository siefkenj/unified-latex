import Prettier from "prettier/standalone";
import { Plugin } from "unified";
import { printLatexAst } from "@unified-latex/unified-latex-prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

type ComplierOptions =
    | { pretty?: boolean; printWidth?: number; useTabs?: boolean }
    | undefined;

/**
 * Unified complier plugin that prints a LaTeX AST as a string.
 */
export const unifiedLatexStringCompiler: Plugin<
    ComplierOptions[],
    Ast.Root,
    string
> = function unifiedLatexStringCompiler(options) {
    const prettyPrinter = (ast: Ast.Root) => {
        // We have already processed the AST. All we want prettier to do is the final
        // text formatting. We create a dummy parser and directly return the ast.
        // Note: if prettier is asked to format the empty string, it will not call the parsers, so we pass in "_"
        return Prettier.format("_", {
            useTabs: true,
            parser: "latex-dummy-parser",
            plugins: [
                {
                    languages: [
                        {
                            name: "latex",
                            extensions: [".tex"],
                            parsers: ["latex-dummy-parser"],
                        },
                    ],
                    parsers: {
                        "latex-dummy-parser": {
                            parse: () => ast,
                            astFormat: "latex-ast",
                            locStart: () => 0,
                            locEnd: () => 1,
                        },
                    },
                    printers: {
                        "latex-ast": {
                            print: printLatexAst as any,
                        },
                    },
                },
            ],
            ...(options || {}),
        });
    };

    Object.assign(this, {
        Compiler: (ast: Ast.Root) => {
            if (!options?.pretty) {
                return printRaw(ast);
            }
            return prettyPrinter(ast);
        },
    });
};
