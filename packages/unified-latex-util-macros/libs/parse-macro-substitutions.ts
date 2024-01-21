import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import {
    MacroSubstitutionPegParser,
    decorateArrayForPegjs,
} from "@unified-latex/unified-latex-util-pegjs";

export function createMatchers() {
    return {
        isHash: (node: Ast.Node) => match.string(node, "#"),
        isNumber: (node: Ast.Node) =>
            match.string(node) && 0 < +node.content.charAt(0),
        splitNumber: (node: Ast.String) => {
            const number = +node.content.charAt(0);
            if (node.content.length > 1) {
                return {
                    number,
                    rest: { type: "string", content: node.content.slice(1) },
                };
            }
            return { number };
        },
    };
}

/**
 * Parse for macro substitutions. For example, in "\foo{#1}", the `#1`
 * is recognized as a `HashNumber` (`{type: "hash_number"}`). Double hashes
 * are automatically replaced with their single-hash substitutions.
 *
 * The resulting AST is ready for substitutions to be applied to it.
 */
export function parseMacroSubstitutions(ast: Ast.Node[]): Ast.Node[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return MacroSubstitutionPegParser.parse(ast, createMatchers());
}
