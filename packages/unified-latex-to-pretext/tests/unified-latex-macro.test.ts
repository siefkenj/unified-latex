import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { report_macros, expand_user_macros } from "../libs/report-and-expand-macros";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:report-and-expand-macro", () => {
    let value: string;

    it("can reported unsupported macros", () => {
        value = String.raw`$\mathbb{R} \fakemacro{X}$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(report_macros(ast)).toEqual(["fakemacro"]);
    });

    it("can report no unsupported macros in mathmode", () => {
        value = String.raw`$\mathbb{R} \frac{1}{2} \cup$`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(report_macros(ast)).toEqual([]);
    });

    it("can report no unsupported macros not in mathmode", () => {
        value = String.raw`\underline{text} \textbf{bold} \subsection{section}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(report_macros(ast)).toEqual([]);
    });

    it("can expand newcommand", () => {
        value = String.raw`\newcommand{\foo}{\bar{#1}}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expand_user_macros(ast)

        expect(printRaw(ast)).toEqual("\\bar{#1}");
    });

    it("can expand renewcommand", () => {
        value = String.raw`\renewcommand{\mathbb{N}}{\N}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expand_user_macros(ast)

        expect(printRaw(ast)).toEqual("\\N");
    });

    it("can expand multiple user-defined commands", () => {
        value = String.raw`\newcommand{\join}{\vee} \renewcommand{\vee}{\foo}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expand_user_macros(ast)

        expect(printRaw(ast)).toEqual("\\vee \\foo");
    });
});