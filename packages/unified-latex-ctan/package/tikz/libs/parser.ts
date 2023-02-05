import * as Ast from "@unified-latex/unified-latex-types";
import * as TikzSpec from "./types";
import { match } from "@unified-latex/unified-latex-util-match";
import { decorateArrayForPegjs } from "@unified-latex/unified-latex-util-pegjs";
import { TikzPegParser } from "@unified-latex/unified-latex-util-pegjs";

type TikzParseOptions = {
    startRule?: "path_spec" | "foreach_body";
};

function createMatchers() {
    return {
        isChar: match.string,
        isTerminal: (node: any) => match.string(node, ";"),
        isOperation: (node: any) =>
            match.anyString(node) && node.content.match(/[a-zA-Z]/),
        isWhitespace: (node: any) =>
            match.whitespace(node) || match.parbreak(node),
        isComment: match.comment,
        isGroup: match.group,
        isMacro: match.macro,
        isAnyMacro: match.anyMacro,
    };
}

const matchers = createMatchers();

/**
 * Parse the contents of the `\systeme{...}` macro
 */
export function parse<Options extends TikzParseOptions>(
    ast: Ast.Node[],
    options?: Options
): Options extends { startRule: infer R }
    ? R extends "path_spec"
        ? TikzSpec.PathSpec
        : TikzSpec.ForeachBody
    : TikzSpec.PathSpec {
    const { startRule = "path_spec" } = options || {};
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return TikzPegParser.parse(ast, {
        ...matchers,
        startRule,
    });
}
