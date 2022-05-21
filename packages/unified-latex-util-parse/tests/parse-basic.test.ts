import util from "util";
import { parse } from "../libs/parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { parseMath } from "../libs/parse-math";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-parse", () => {
    it("Parses empty string", () => {
        parse("");
    });

    it("Parses inline math", () => {
        parse("$x^2$");
    });

    it("Parses displaystyle math", () => {
        parse(String.raw`\[x^2\]`);
    });

    it("Parses text", () => {
        parse("hi, I am text");
    });

    it("Renders flat strings correctly", () => {
        const FLAT_STRINGS = [
            String.raw`"some words with spaces"`,
            String.raw`$a math equation$`,
            String.raw`$x^{2}$`,
            String.raw`{a group { of text}}`,
            String.raw`\begin{env}text\end{env}`,
            String.raw`\begin{strange*\yy}a strange environment\end{strange*\yy}`,
            String.raw`\hi 22, I am te$xt$\begin{abc}[1,2]xx\end{abc}`,
            "a comment % at the end\nof a line",
            "a comment %    with    extra    spaces",
            "a comment\n% at a new position\non the next line",
            "a comment % at a new position\n\nwith a parbreak",
            String.raw`\verb|$|`,
            String.raw`\verb*|$|`,
            String.raw`\begin{verbatim}$\end{verbatim}`,
            String.raw`\begin{verbatim*}$\end{verbatim*}`,
            String.raw`\begin{comment}$\end{comment}`,
        ];
        for (const str of FLAT_STRINGS) {
            expect(printRaw(parse(str))).toMatch(str);
        }
        const STRINGS_WITH_EXCESS_SPACE = [
            [
                String.raw`"some    words with spaces"`,
                String.raw`"some words with spaces"`,
            ],
            [
                "some    \n\n           words with spaces",
                "some\n\nwords with spaces",
            ],
            [
                "spaces at the start%\n    of a newline are ignored",
                "spaces at the start%\nof a newline are ignored",
            ],
            [
                "a comment \n% at a new position\non the next line",
                "a comment\n% at a new position\non the next line",
            ],
        ];

        for (const [inStr, outStr] of STRINGS_WITH_EXCESS_SPACE) {
            expect(printRaw(parse(inStr))).toMatch(outStr);
        }
    });

    it("Parses unbalanced groups/unbalanced math", () => {
        let parsed = parse("{");
        expect(printRaw(parsed)).toEqual("{");

        parsed = parse("}");
        expect(printRaw(parsed)).toEqual("}");

        parsed = parse("$$");
        expect(printRaw(parsed)).toEqual("$$");

        parsed = parse("$$$");
        expect(printRaw(parsed)).toEqual("$$$");

        parsed = parse("$$x$");
        expect(printRaw(parsed)).toEqual("$$x$");

        parsed = parse("{{{}{}}{}{{{}");
        expect(printRaw(parsed)).toEqual("{{{}{}}{}{{{}");
    });

    it("Parses \\^ and \\_ macros correctly (e.g. doesn't attach an argument to them)", () => {
        let parsed = parse("^2");
        expect(printRaw(parsed)).toEqual("^2");

        parsed = parse("$^2$");
        expect(printRaw(parsed)).toEqual("$^{2}$");

        parsed = parse("\\^2");
        expect(printRaw(parsed)).toEqual("\\^2");

        parsed = parse("$\\^2$");
        expect(printRaw(parsed)).toEqual("$\\^2$");

        parsed = parse("_2");
        expect(printRaw(parsed)).toEqual("_2");

        parsed = parse("$_2$");
        expect(printRaw(parsed)).toEqual("$_{2}$");

        parsed = parse("\\_2");
        expect(printRaw(parsed)).toEqual("\\_2");
    });

    it("Can parse math mode directly", () => {
        let parsed;
        parsed = parseMath("^2");
        expect(printRaw(parsed)).toEqual("^{2}");
    });

    it("Puts braces around arguments", () => {
        const parsed = parse("\\mathbb X");
        expect(printRaw(parsed)).toEqual("\\mathbb{X}");
    });

    it("Can parse trailing \\", () => {
        const parsed = parse("\\");
        expect(printRaw(parsed)).toEqual("\\");
    });
});
