import { PgfkeysPegParser } from "../../unified-latex-util-pegjs/libs/pegjs-parsers";
import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import { decorateArrayForPegjs } from "../../unified-latex-util-pegjs";

// The types returned by the grammar

export type Item = {
    itemParts?: Ast.Node[][];
    trailingComment: Ast.Comment | null;
    trailingComma?: boolean;
    leadingParbreak?: boolean;
};

export function createMatchers() {
    return {
        isComma: (node: Ast.Node) => match.string(node, ","),
        isEquals: (node: Ast.Node) => match.string(node, "="),
        isWhitespace: (node: Ast.Node) => match.whitespace(node),
        isParbreak: (node: Ast.Node) => match.parbreak(node),
        isSameLineComment: (node: Ast.Node) =>
            match.comment(node) && node.sameline,
        isOwnLineComment: (node: Ast.Node) =>
            match.comment(node) && !node.sameline,
    };
}

/**
 * Parse the arguments of a Pgfkeys macro. The `ast`
 * is expected to be a comma separated list of `Item`s.
 * Each item can have 0 or more item parts, which are separated
 * by "=". If `itemPart` is undefined,
 *
 * @export
 * @param {Ast.Node[]} ast
 * @returns {Item[]}
 */
export function parsePgfkeys(ast: Ast.Node[]): Item[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return PgfkeysPegParser.parse(ast, createMatchers());
}
