import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { parseTexGlue } from "..";
import { processLatexViaUnified } from "../../unified-latex-util-parse";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

function removeWhitespace(x: string) {
    return x.replace(/\s+/g, "");
}

describe("unified-latex-util-glue", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can parse raw glue string", () => {
        expect(parseTexGlue(removeWhitespace("3mm"))).toEqual({
            fixed: { type: "dim", unit: "mm", value: 3 },
            position: {
                end: { column: 4, line: 1, offset: 3 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: null,
            stretchable: null,
            type: "glue",
        });
        expect(parseTexGlue(removeWhitespace("3mm plus 7in"))).toEqual({
            fixed: { type: "dim", unit: "mm", value: 3 },
            position: {
                end: { column: 11, line: 1, offset: 10 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: null,
            stretchable: { type: "dim", unit: "in", value: 7 },
            type: "glue",
        });
        expect(parseTexGlue(removeWhitespace("3mm plus -.7in"))).toEqual({
            fixed: { type: "dim", unit: "mm", value: 3 },
            position: {
                end: { column: 13, line: 1, offset: 12 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: null,
            stretchable: { type: "dim", unit: "in", value: -0.7 },
            type: "glue",
        });
        expect(
            parseTexGlue(removeWhitespace("3mm plus -.7in minus 6ex"))
        ).toEqual({
            fixed: { type: "dim", unit: "mm", value: 3 },
            position: {
                end: { column: 21, line: 1, offset: 20 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: { type: "dim", unit: "ex", value: 6 },
            stretchable: { type: "dim", unit: "in", value: -0.7 },
            type: "glue",
        });
    });
    it("ignores characters after glue", () => {
        expect(parseTexGlue(removeWhitespace("3mmXX"))).toEqual({
            fixed: { type: "dim", unit: "mm", value: 3 },
            position: {
                end: { column: 4, line: 1, offset: 3 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: null,
            stretchable: null,
            type: "glue",
        });
    });
    it("parses multi-digit glue", () => {
        expect(parseTexGlue(removeWhitespace("30mmXX"))).toEqual({
            fixed: { type: "dim", unit: "mm", value: 30 },
            position: {
                end: { column: 5, line: 1, offset: 4 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: null,
            stretchable: null,
            type: "glue",
        });
        expect(parseTexGlue(removeWhitespace("30.55mmXX"))).toEqual({
            fixed: { type: "dim", unit: "mm", value: 30.55 },
            position: {
                end: { column: 8, line: 1, offset: 7 },
                start: { column: 1, line: 1, offset: 0 },
            },
            shrinkable: null,
            stretchable: null,
            type: "glue",
        });
    });
    it("returns `null` for missing glue", () => {
        expect(parseTexGlue(removeWhitespace("3XX"))).toEqual(null);
    });
});
