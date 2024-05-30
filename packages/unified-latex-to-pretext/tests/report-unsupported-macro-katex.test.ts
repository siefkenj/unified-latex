import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { reportMacrosUnsupportedByKatex } from "@unified-latex/unified-latex-to-pretext/libs/report-unsupported-macro-katex";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:report-unsupported-macro-katex", () => {
    let value: string;

    it("can reported unsupported macros", () => {
        value = String.raw`$\mathbb{R} \fakemacro{X}$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast)).toEqual(["fakemacro"]);
    });

    it("can report no unsupported macros in mathmode", () => {
        value = String.raw`$\mathbb{R} \frac{1}{2} \cup$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast)).toEqual([]);
    });

    // change to Unsupported macros outside of math mode.
    it("can report no unsupported macros not in mathmode", () => {
        value = String.raw`\underline{text} \textbf{bold} \subsection{section}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(reportMacrosUnsupportedByKatex(ast)).toEqual([]);
    });
});
