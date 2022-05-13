import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { convertToHtml } from "../../unified-latex-to-hast";
import { parse, parseMath } from "../../unified-latex-util-parse";
import { printRaw } from "../../unified-latex-util-print-raw";
import * as systemeParser from "../package/systeme";
import {
    extractVariables,
    systemeContentsToArray,
} from "../package/systeme/libs/systeme";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-ctan:systeme", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    const SYSTEME_STRINGS = [
        "c",
        "x+y",
        "x+y=3",
        "x=3,-y=9x+y",
        "x@4,2x_{2}=y",
        "foo%comment\nbar,=66,\n%comment\nx",
    ];

    for (const spec of SYSTEME_STRINGS) {
        it(`parses systeme system "${spec}"`, () => {
            let parsedSpec = parseMath(spec);
            const ast = systemeParser.parse(parsedSpec);
            expect(systemeParser.printRaw(ast)).toEqual(spec);
        });
    }

    it("extracts variables from systeme body", () => {
        let parsedSpec, ast, vars;
        parsedSpec = parseMath("x+y=3");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y"]));

        parsedSpec = parseMath("x+y=3, -y=2");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y"]));

        parsedSpec = parseMath("x+y=3, -y+7z=2");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y", "z"]));

        parsedSpec = parseMath("x+y=3, -y_1+7z=2");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y", "z", "y_{1}"]));

        parsedSpec = parseMath("x+y=3, -y+7z=2 @k +z+l, kz=5");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y", "z", "k"]));
    });

    it("extracts custom-specified variables from systeme body", () => {
        let parsedSpec, ast, vars;
        parsedSpec = parseMath("x+y=3");
        ast = systemeParser.parse(parsedSpec, { whitelistedVariables: ["x"] });
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x"]));

        parsedSpec = parseMath("ax+by=3");
        ast = systemeParser.parse(parsedSpec, {
            whitelistedVariables: ["x", "y", "z"],
        });
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y"]));

        parsedSpec = parseMath("-\\alpha+7x\\beta=3");
        ast = systemeParser.parse(parsedSpec, {
            whitelistedVariables: [
                { type: "macro", content: "alpha" },
                { type: "macro", content: "beta" },
            ],
        });
        vars = extractVariables(ast).map((v) => printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["\\alpha", "\\beta"]));
    });

    it("can convert systeme contents to array", () => {
        let parsedSpec, ast;
        parsedSpec = parseMath("x+y=3,-y-3x+10=7");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}"
        );

        // If the leading operations are all +, then there isn't a leading column for operations
        parsedSpec = parseMath("x+y=3,-y+3x+10=7");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrcrl}x&+&y&&&=3\\\\3x&-&y&+&10&=7\\end{array}"
        );

        // If every item on the left has a variable, the extra space for a constant term is removed.
        parsedSpec = parseMath("x+y=3,-y+3x=7");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrl}x&+&y&=3\\\\3x&-&y&=7\\end{array}"
        );

        // Can specify the order of variables.
        parsedSpec = parseMath("x+y=3,y+3x=7");
        ast = systemeContentsToArray(parsedSpec, {
            properSpacing: false,
            whitelistedVariables: ["y", "x"],
        });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrl}y&+&x&=3\\\\y&+&3x&=7\\end{array}"
        );

        // A space doesn't count as a variable, even if specified.
        parsedSpec = parseMath("x+y=3,y+3x=7");
        ast = systemeContentsToArray(parsedSpec, {
            properSpacing: false,
            whitelistedVariables: ["y", "x", " "],
        });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrl}y&+&x&=3\\\\y&+&3x&=7\\end{array}"
        );

        // Can handle annotations and empty lines
        parsedSpec = parseMath("x+y=3@foo,-y+3x=7,,x");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrll}x&+&y&=3&\\quad foo\\\\3x&-&y&=7&\\\\&&&&\\\\x&&&&\\end{array}"
        );

        // Can parse with zero specified variables
        parsedSpec = parseMath("x+y=3,-y+3x=7");
        ast = systemeContentsToArray(parsedSpec, {
            properSpacing: false,
            whitelistedVariables: [],
        });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{crl}&x+y&=3\\\\-&y+3x&=7\\end{array}"
        );
    });

    it("can preserve systeme delimiters", () => {
        let parsed, html;
        parsed = parse("$\\systeme{x+y=3,-y-3x+10=7}$");
        html = convertToHtml(parsed);
        expect(html).toEqual(
            // "$\\left\\{\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}\\right.$"
            '<span class="inline-math">\\left\\{\\begin{array}{crcrcrl}&#x26;x&#x26;+&#x26;y&#x26;&#x26;&#x26;=3\\\\-&#x26;3x&#x26;-&#x26;y&#x26;+&#x26;10&#x26;=7\\end{array}\\right.</span>'
        );

        parsed = parse("$\\sysdelim{\\{}{.}\\systeme{x+y=3,-y-3x+10=7}$");
        html = convertToHtml(parsed);
        expect(html).toEqual(
            // "$\\left\\{\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}\\right.$"
            '<span class="inline-math">\\left\\{\\begin{array}{crcrcrl}&#x26;x&#x26;+&#x26;y&#x26;&#x26;&#x26;=3\\\\-&#x26;3x&#x26;-&#x26;y&#x26;+&#x26;10&#x26;=7\\end{array}\\right.</span>'
        );
        parsed = parse("$\\sysdelim{[}{]}\\systeme{x+y=3,-y-3x+10=7}$");
        html = convertToHtml(parsed);
        expect(html).toEqual(
            // "$\\left[\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}\\right]$"
            '<span class="inline-math">\\left[\\begin{array}{crcrcrl}&#x26;x&#x26;+&#x26;y&#x26;&#x26;&#x26;=3\\\\-&#x26;3x&#x26;-&#x26;y&#x26;+&#x26;10&#x26;=7\\end{array}\\right]</span>'
        );
    });
});
