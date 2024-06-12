import util from "util";
import { describe, it, expect } from "vitest";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { returnUnsupportedMacro } from "../libs/unsupported-macro";

const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("returnUnsupportedMacro", () => {
    it("returns unsupported macros", () => {
        const sampleLatex = String.raw`
        Both should support:
        This is \textbf{an} example of a \LaTeX{} document with \textit{some} macros.
        \[
            e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}.
        \]
        What an \textit{\textbf{amazing}} formula! $\circlearrowleft$

        Both support but not rendered in Katex: $\dddot{d} $

        Latex supports but not katex: \c{o}

        Neither support: \notAMacro
        `;

        const parser = getParser();
        const ast = parser.parse(sampleLatex);
        expect(returnUnsupportedMacro(ast)).toEqual(["c", "notAMacro"]);
    });

    it("handles empty AST", () => {
        const parser = getParser();
        const ast = parser.parse();
        expect(returnUnsupportedMacro(ast)).toEqual([]);
    });

    it("handles no unsupported macros", () => {
        const sampleLatex = String.raw`
        This is \textbf{an} example of a Latex document with \textit{some} macros.
        \[
            e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}.
        \]
        What an \textit{\textbf{amazing}} formula!
        `;

        const parser = getParser();
        const ast = parser.parse(sampleLatex);
        expect(returnUnsupportedMacro(ast)).toEqual([]);
    });
});
