import util from "util";
import { m } from "../../unified-latex-builder";
import * as Ast  from "../../unified-latex-types";
import { attachMacroArgsInArray } from "../../unified-latex-util-arguments/libs/attach-arguments";

import * as latexParser from "../../unified-latex-util-parse";
import { printRaw } from "../../unified-latex-util-print-raw";
import { expandMacros } from "../libs/expand-macros";
import { createMacroExpander } from "../libs/newcommand";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const EMPTY_MACRO = m("")

/**
 * Parse a macro of the form `\xxx{A}{B}`. The macro
 * signature is assumed to be "m m".
 */
function parseXxxMacro(str:string): Ast.Macro {
    const nodes = latexParser.parse(str).content
    attachMacroArgsInArray(nodes, {xxx:{signature: "m m"}})
    return nodes[0] as Ast.Macro
}

describe("unified-latex-utils-macros", () => {
    it("Can expand ## to #", () => {
        let macroBody = latexParser.parse(
            String.raw`a b ## c ####2 ##1`
        ).content;
        const expander = createMacroExpander(macroBody);
        expect(printRaw(expander(EMPTY_MACRO))).toEqual(
            "a b # c ##2 #1"
        );
    });

    it("Can substitute #1 and #2 for arguments", () => {
        let substitutionBody = latexParser.parse("a b #1 c ##2 #2").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{A}{B}");

        const expander = createMacroExpander(substitutionBody);
        expect(printRaw(expander(macro))).toEqual("a b A c #2 B");
    });

    it("Can substitute if nested", () => {
        let substitutionBody = latexParser.parse("a b {#1 c ##2 #2}").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{A}{B}");

        const expander = createMacroExpander(substitutionBody);
        expect(printRaw(expander(macro))).toEqual("a b {A c #2 B}");
    });

    it("Can substitute if in argument", () => {
        let substitutionBody = latexParser.parse("a b \\mathbb{#1}").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{A}{B}");

        const expander = createMacroExpander(substitutionBody);
        expect(printRaw(expander(macro))).toEqual("a b \\mathbb{A}");
    });

    it("Can substitute if in math", () => {
        let substitutionBody = latexParser.parse("a $x^{#1}_{#2}$").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{A}{B}");

        const expander = createMacroExpander(substitutionBody);
        expect(printRaw(expander(macro))).toEqual("a $x^{A}_{B}$");
    });

    it("Can expand macro", () => {
        let substitution = latexParser.parse("$x^{#1}_{#2}$").content;
        let nodes = latexParser.parse(
            "Look at \\xxx{A}{B} and \\xxx{me}{you}"
        ).content;
        attachMacroArgsInArray(nodes, {xxx:{signature: "m m"}})

        expandMacros(nodes, [{ name: "xxx", substitution }]);
        expect(printRaw(nodes)).toEqual(
            "Look at $x^{A}_{B}$ and $x^{me}_{you}$"
        );
    });
});
