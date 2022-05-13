import { XColorPegParser } from "../../../../unified-latex-util-pegjs/libs/pegjs-parsers";
import * as XColorSpec from "./types";

const parseCache: Record<string, XColorSpec.Ast> = {};

/**
 * Parse an `xparse` argument specification string to an AST.
 * This function caches results. Don't mutate the returned AST!
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parse(str = ""): XColorSpec.Ast {
    parseCache[str] = parseCache[str] || XColorPegParser.parse(str);
    return parseCache[str];
}
