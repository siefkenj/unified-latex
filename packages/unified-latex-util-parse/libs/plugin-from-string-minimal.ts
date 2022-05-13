import { Plugin, Parser } from "unified";
import * as Ast from "../../unified-latex-types";
import { parseMathMinimal, parseMinimal } from "./parse-minimal";

type PluginOptions = {
    /**
     * Whether the text will be parsed assuming math mode or not.
     */
    mode: "math" | "regular";
} | void;

/**
 * Parse a string to a LaTeX AST with no post processing. For example,
 * no macro arguments will be attached, etc.
 */
export const unifiedLatexFromStringMinimal: Plugin<
    PluginOptions[],
    string,
    Ast.Root
> = function unifiedLatexFromStringMinimal(options) {
    const parser: Parser<Ast.Root> = (str) => {
        if (options?.mode === "math") {
            return {
                type: "root",
                content: parseMathMinimal(str),
                _renderInfo: { inMathMode: true },
            };
        }
        return parseMinimal(str);
    };

    Object.assign(this, { Parser: parser });
};
