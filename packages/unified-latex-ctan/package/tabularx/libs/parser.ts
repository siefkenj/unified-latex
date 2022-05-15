import { TabularPegParser } from "@unified-latex/unified-latex-util-pegjs";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import {
    decorateArrayForPegjs,
    splitStringsIntoSingleChars,
} from "@unified-latex/unified-latex-util-pegjs";
import * as TabularSpec from "./types";

function createMatchers() {
    return {
        matchChar: (node: Ast.Node, char: string) => match.string(node, char),
        isWhitespace: match.whitespace,
        isGroup: match.group,
    };
}

/**
 * Parse a tabular/tabularx specification, e.g. `"|c|r|r|"`. This parser assumes the specification has
 * already been parsed as LaTeX.
 */
export function parseTabularSpec(ast: Ast.Node[]): TabularSpec.TabularColumn[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // All tabular spec commands are single letters, so we pre-split all strings
    // for easy parsing.
    ast = splitStringsIntoSingleChars(ast);
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return TabularPegParser.parse(ast, createMatchers());
}
