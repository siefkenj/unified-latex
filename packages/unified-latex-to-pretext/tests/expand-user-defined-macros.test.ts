import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { ExpandUserDefinedMacros } from "@unified-latex/unified-latex-to-pretext/libs/expand-user-defined-macros";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:report-and-expand-macro", () => {
    let value: string;

    it("can expand newcommand", () => {
        value = String.raw`\newcommand{\foo}{\bar{#1}}`;

        const parser = getParser();
        const ast = parser.parse(value);

        ExpandUserDefinedMacros(ast);

        expect(printRaw(ast)).toEqual("\\bar{#1}");
    });

    it("can expand renewcommand", () => {
        value = String.raw`\renewcommand{\mathbb{N}}{\N}`;

        const parser = getParser();
        const ast = parser.parse(value);

        ExpandUserDefinedMacros(ast);

        expect(printRaw(ast)).toEqual("\\N");
    });

    it("can expand multiple user-defined commands", () => {
        value = String.raw`\newcommand{\join}{\vee} \renewcommand{\vee}{\foo}`;

        const parser = getParser();
        const ast = parser.parse(value);

        ExpandUserDefinedMacros(ast);

        expect(printRaw(ast)).toEqual("\\vee \\foo");
    });
});
