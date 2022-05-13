import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { prefixMatch } from "..";
import * as Ast from "../../unified-latex-types";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const SAMPLE: Ast.Node[] = [
    {
        type: "string",
        content: "h",
    },
    {
        type: "string",
        content: "e",
    },
    {
        type: "string",
        content: "l",
    },
    {
        type: "string",
        content: "l",
    },
    {
        type: "string",
        content: "o",
    },
    {
        type: "whitespace",
    },
    {
        type: "string",
        content: "y",
    },
    {
        type: "string",
        content: "o",
    },
    {
        type: "string",
        content: "u",
    },
];
const SAMPLE2: Ast.Node[] = [
    {
        type: "string",
        content: "hell",
    },
    {
        type: "string",
        content: "o",
    },
];

describe("unified-latex-scan", () => {
    it("can do a prefix search", () => {
        expect(prefixMatch(SAMPLE, "hel")).toEqual({
            endNodeIndex: 2,
            endNodePartialMatch: null,
            match: "hel",
        });
        expect(prefixMatch(SAMPLE, "llo", { startIndex: 2 })).toEqual({
            endNodeIndex: 4,
            endNodePartialMatch: null,
            match: "llo",
        });
        expect(prefixMatch(SAMPLE, "llo", { startIndex: 1 })).toBeFalsy();
        expect(prefixMatch(SAMPLE, "hal")).toBeFalsy();
        expect(prefixMatch(SAMPLE, "hellow")).toBeFalsy();
    });
    it("can do a prefix search with partial matches", () => {
        expect(prefixMatch(SAMPLE2, "hello")).toEqual({
            endNodeIndex: 1,
            endNodePartialMatch: null,
            match: "hello",
        });
        expect(
            prefixMatch(SAMPLE2, "hello", { assumeOneCharStrings: true })
        ).toBeFalsy();
        expect(prefixMatch(SAMPLE2, "hel")).toBeFalsy();
        expect(prefixMatch(SAMPLE2, "hel", { matchSubstrings: true })).toEqual({
            endNodeIndex: 0,
            endNodePartialMatch: "hel",
            match: "hel",
        });
    });
});
