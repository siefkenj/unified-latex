import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { reportMacrosUnsupportedByKatex } from "@unified-latex/unified-latex-to-pretext/libs/pre-conversion-subs/report-unsupported-macro-katex";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:report-unsupported-macro-katex", () => {
    let value: string;

    it("can report unsupported macros in inline mathmode", () => {
        value = String.raw`$\mathbb{R} \fakemacro{X}$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast).messages.length).toEqual(1);
    });

    it("can report no unsupported macros in mathmode", () => {
        value = String.raw`$\mathbb{R} \frac{1}{2} \cup$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast).messages.length).toEqual(0);
    });

    it("doesn't report unsupported macros outside of math mode", () => {
        value = String.raw`\fakemacro`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast).messages.length).toEqual(0);
    });

    it("reports unsupported macros in text mode with a math anscestor", () => {
        value = String.raw`$\frac{1}{\text{ hi \unsupported}}$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast).messages.length).toEqual(1);
    });

    it("can report unsupported macros in display mathmode", () => {
        value = String.raw`\[ \frac{a}{b} \fake \text{bar \baz}\] \bang`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast).messages.length).toEqual(2);
    });

    it("can report unsupported macros in equation environment", () => {
        value = String.raw`\unsupported \begin{equation} \mathbb{N} \unsupported \text{\baz}\end{equation}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast).messages.length).toEqual(2);
    });
});
