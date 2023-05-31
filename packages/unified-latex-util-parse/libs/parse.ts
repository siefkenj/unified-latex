import * as Ast from "@unified-latex/unified-latex-types";
import { type FrozenProcessor, unified } from "unified";
import { unifiedLatexFromString } from "./plugin-from-string";
import type { PluginOptions } from "./plugin-from-string";

let parser = unified().use(unifiedLatexFromString).freeze();

/**
 * Parse the string into an AST.
 */
export function parse(str: string): Ast.Root {
    return parser.parse(str);
}

/**
 * Returns the default `unified-latex` parser, or create a new one with the
 * provided `unifiedLatexFromString` options
 * @param options Plugin options of `unifiedLatexFromString` plugin.
 * @returns The default `unified-latex` parser if `options` is `undefined`, or a
 * newly created `unified-latex` parser with the provided `options`.
 */
export function getParser(
    options?: PluginOptions
): FrozenProcessor<Ast.Root, Ast.Root, Ast.Root, void> {
    return options
        ? unified().use(unifiedLatexFromString, options).freeze()
        : parser;
}
