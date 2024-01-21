import { m } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import util from "util";
import { attachMacroArgsInArray } from "../../unified-latex-util-arguments/libs/attach-arguments";

import * as latexParser from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { expandMacros } from "../libs/expand-macros";
import { createMacroExpander } from "../libs/newcommand";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const EMPTY_MACRO = m("");

/**
 * Parse a macro of the form `\xxx{A}{B}`. The macro
 * signature is assumed to be "m m" by default.
 */
function parseXxxMacro(str: string, signature = "m m"): Ast.Macro {
    const nodes = latexParser.parse(str).content;
    attachMacroArgsInArray(nodes, { xxx: { signature } });
    return nodes[0] as Ast.Macro;
}

describe("unified-latex-utils-macros", () => {
    it("Can expand ## to #", () => {
        let macroBody = latexParser.parse(
            String.raw`a b ## c ####2 ##1`
        ).content;
        const expander = createMacroExpander(macroBody);
        expect(printRaw(expander(EMPTY_MACRO))).toEqual("a b # c ##2 #1");
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

    it("Can substitute default arguments", () => {
        let substitutionBody = latexParser.parse("a b #1 c #2").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{B}", "O{A} m");

        const expander = createMacroExpander(substitutionBody, "O{A} m");
        expect(printRaw(expander(macro))).toEqual("a b A c B");
    });

    it("Can substitute default arguments requiring additional parse", () => {
        let substitutionBody = latexParser.parse("a b #1 c #2").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{B}", "O{\\LaTeX} m");

        const expander = createMacroExpander(substitutionBody, "O{\\LaTeX} m");
        const expanded = expander(macro);
        expect(printRaw(expanded)).toEqual("a b \\LaTeX c B");
        expect(trimRenderInfo(expanded[4])).toEqual({
            type: "macro",
            content: "LaTeX",
        });
    });

    it("Does not substitute default arguments if empty string is provided", () => {
        let substitutionBody = latexParser.parse("a b #1 c #2").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro(
            "\\xxx\\open\\close{B}",
            "D\\open\\close{A} m"
        );

        const expander = createMacroExpander(
            substitutionBody,
            "D\\open\\close{A} m"
        );
        expect(printRaw(expander(macro))).toEqual("a b  c B");
    });

    it("Can substitute default arguments of embellishments", () => {
        let substitutionBody = latexParser.parse("#1 #2 #3 #4 #5").content;
        // This macro defines the args that will be substituted
        let macro = parseXxxMacro("\\xxx{A}_X", "m O{B} E{^_}{{C}{D}} D<>E");

        const expander = createMacroExpander(
            substitutionBody,
            "m O{B} E{^_}{{C}{D}} D<>E"
        );
        expect(printRaw(expander(macro))).toEqual("A B C X E");
    });

    it("Can expand macro", () => {
        let body = latexParser.parse("$x^{#1}_{#2}$").content;
        let nodes = latexParser.parse(
            "Look at \\xxx{A}{B} and \\xxx{me}{you}"
        ).content;
        attachMacroArgsInArray(nodes, { xxx: { signature: "m m" } });

        expandMacros(nodes, [{ name: "xxx", body }]);
        expect(printRaw(nodes)).toEqual(
            "Look at $x^{A}_{B}$ and $x^{me}_{you}$"
        );
    });
});
