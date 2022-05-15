import util from "util";
import { strToNodes } from "../../test-common";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import { splitOnMacro } from "../libs/split-on-macro";
import { unsplitOnMacro } from "../libs/unsplit-on-macro";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-split", () => {
    it("splits based on a macro", () => {
        // basic splitting
        let ast = strToNodes("a\\xxx b c\\xxx x y z");
        expect(splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [
                    {
                        type: "string",
                        content: "a",
                    },
                ],
                [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
                [
                    { type: "whitespace" },
                    { type: "string", content: "x" },
                    { type: "whitespace" },
                    { type: "string", content: "y" },
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "z",
                    },
                ],
            ],
            macros: [
                { type: "macro", content: "xxx" },
                { type: "macro", content: "xxx" },
            ],
        });

        // macro at start
        ast = strToNodes("\\xxx b c\\xxx x y z");
        expect(splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [],
                [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
                [
                    { type: "whitespace" },
                    { type: "string", content: "x" },
                    { type: "whitespace" },
                    { type: "string", content: "y" },
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "z",
                    },
                ],
            ],
            macros: [
                {
                    type: "macro",
                    content: "xxx",
                },
                { type: "macro", content: "xxx" },
            ],
        });

        // only macro
        ast = strToNodes("\\xxx");
        expect(splitOnMacro(ast, "xxx")).toEqual({
            segments: [[], []],
            macros: [
                {
                    type: "macro",
                    content: "xxx",
                },
            ],
        });

        // empty ast
        ast = [];
        expect(splitOnMacro(ast, "xxx")).toEqual({
            segments: [[]],
            macros: [],
        });

        // no macro
        ast = strToNodes("a b c");
        expect(splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [
                    {
                        type: "string",
                        content: "a",
                    },
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "c",
                    },
                ],
            ],
            macros: [],
        });
    });

    it("preserves macro arguments when splitting", () => {
        // preserve macro args
        let ast = strToNodes("\\xxx a b \\xxx c d");
        attachMacroArgs(ast, { xxx: { signature: "m" } });

        expect(splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [],
                [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                ],
                [
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "d",
                    },
                ],
            ],
            macros: [
                {
                    type: "macro",
                    content: "xxx",
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "a" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
                {
                    type: "macro",
                    content: "xxx",
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "c" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
            ],
        });
    });

    it("unsplits based on a macro", () => {
        // Splitting and unsplitting should be the identity map
        for (const str of [
            "\\xxx a b \\xxx c d",
            "x y\\xxx a b \\xxx c d",
            "",
            "\\xxx",
            "a b c",
        ]) {
            const ast = strToNodes(str);
            const split = splitOnMacro(ast, "xxx");
            expect(unsplitOnMacro(split)).toEqual(ast);
        }
    });
});
