import * as Ast from "@unified-latex/unified-latex-types";
import * as SystemeSpec from "./types";
import { match } from "@unified-latex/unified-latex-util-match";
import { decorateArrayForPegjs } from "@unified-latex/unified-latex-util-pegjs";
import { SystemePegParser } from "@unified-latex/unified-latex-util-pegjs";

type SystemeMatchers = {
    at?: string;
    equals?: string;
    equationSeparator?: string;
    mathOperations?: string[];
    whitelistedVariables?: (string | Ast.String | Ast.Macro)[];
};

function createMatchers({
    at = "@",
    equals = "=",
    equationSeparator = ",",
    mathOperations = ["+", "-"],
    whitelistedVariables,
}: SystemeMatchers = {}) {
    let isVar: (node: Ast.Node) => boolean = (node: Ast.Node) =>
        match.anyString(node) && !!node.content.match(/[a-zA-Z]/);
    if (whitelistedVariables) {
        // Unwrap all strings
        whitelistedVariables = whitelistedVariables.map((v) =>
            match.anyString(v) ? v.content : v
        );
        const macros = whitelistedVariables.filter((v) =>
            match.anyMacro(v)
        ) as Ast.Macro[];
        const strings = whitelistedVariables.filter(
            (v) => typeof v === "string"
        ) as string[];
        const macroHash = Object.fromEntries(macros.map((v) => [v.content, v]));
        const stringHash = Object.fromEntries(strings.map((s) => [s, s]));
        const macroMatcher = match.createMacroMatcher(macroHash);
        isVar = (node: Ast.Node) =>
            macroMatcher(node) ||
            (match.anyString(node) && !!stringHash[node.content]);
    }
    return {
        isSep: (node: Ast.Node) => match.string(node, equationSeparator),
        isVar,
        isOperation: (node: Ast.Node) =>
            mathOperations.some((op) => match.string(node, op)),
        isEquals: (node: Ast.Node) => match.string(node, equals),
        isAt: (node: Ast.Node) => match.string(node, at),
        isSubscript: (node: Ast.Node) =>
            match.macro(node, "_") && node.escapeToken === "",
        isWhitespace: match.whitespace,
        isSameLineComment: (node: Ast.Node) =>
            match.comment(node) && node.sameline,
        isOwnLineComment: (node: Ast.Node) =>
            match.comment(node) && !node.sameline,
    };
}

/**
 * Parse the contents of the `\systeme{...}` macro
 */
export function parse(
    ast: Ast.Node[],
    options?: SystemeMatchers
): SystemeSpec.Line[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return SystemePegParser.parse(
        ast,
        createMatchers(options || {})
    ) as SystemeSpec.Line[];
}
