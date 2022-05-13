import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import {
    AlignEnvironmentPegParser,
    decorateArrayForPegjs,
} from "../../unified-latex-util-pegjs";

// The types returned by the grammar
interface RowItems {
    cells: Ast.Node[][];
    colSeps: Ast.String[];
}

interface Row extends RowItems {
    rowSep: Ast.Macro | null;
    trailingComment: Ast.Comment | null;
}

export function createMatchers(rowSepMacros: string[], colSep: string[]) {
    const isRowSep = match.createMacroMatcher(rowSepMacros);
    return {
        isRowSep,
        isColSep: (node: Ast.Node) =>
            colSep.some((sep) => match.string(node, sep)),
        isWhitespace: (node: Ast.Node) => match.whitespace(node),
        isSameLineComment: (node: Ast.Node) =>
            match.comment(node) && node.sameline,
        isOwnLineComment: (node: Ast.Node) =>
            match.comment(node) && !node.sameline,
    };
}

/**
 * Parse the content of an align environment into an array of row objects.
 * Each row object looks like
 * ```
 *  {
 *    cells: [...],
 *    colSeps: [...],
 *    rowSep: ...,
 *    trailingComment: ...
 *  }
 * ```
 * `...` may be an ast node or `null`.
 *
 * @export
 * @param {[object]} ast
 * @param {string} [colSep=["&"]]
 * @param {string} [rowSepMacros=["\\", "hline", "cr"]]
 * @returns
 */
export function parseAlignEnvironment(
    ast: Ast.Node[],
    colSep = ["&"],
    rowSepMacros = ["\\", "hline", "cr"]
): Row[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return AlignEnvironmentPegParser.parse(
        ast,
        createMatchers(rowSepMacros, colSep)
    );
}
