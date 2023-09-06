import util from "util";
import { strToNodes } from "../../test-common";
import { attachMacroArgsInArray } from "../libs/attach-arguments";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    it("can attach arguments in array", () => {
        // basic capture of arguments
        let nodes = strToNodes("\\xxx a b c");
        attachMacroArgsInArray(nodes, { xxx: { signature: "m m" } });
        expect(nodes).toEqual([
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
                    {
                        type: "argument",
                        content: [{ type: "string", content: "b" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
            { type: "whitespace" },
            { type: "string", content: "c" },
        ]);

        // right associativity of arguments (required for things like `\mathbb`)
        nodes = strToNodes("\\xxx\\xxx a b c");
        attachMacroArgsInArray(nodes, { xxx: { signature: "m m" } });
        expect(nodes).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [
                            {
                                type: "macro",
                                content: "xxx",
                                args: [
                                    {
                                        type: "argument",
                                        content: [
                                            { type: "string", content: "a" },
                                        ],
                                        openMark: "{",
                                        closeMark: "}",
                                    },
                                    {
                                        type: "argument",
                                        content: [
                                            { type: "string", content: "b" },
                                        ],
                                        openMark: "{",
                                        closeMark: "}",
                                    },
                                ],
                            },
                        ],
                        openMark: "{",
                        closeMark: "}",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "c" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
        ]);

        // not enough required arguments still passes. Un-found arguments
        // are replaced with blank arguments
        nodes = strToNodes("\\xxx   c");
        attachMacroArgsInArray(nodes, { xxx: { signature: "m m" } });
        expect(nodes).toEqual([
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
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                ],
            },
        ]);
        // Mixed optional and required arguments
        nodes = strToNodes("\\xxx   [c] d e f");
        attachMacroArgsInArray(nodes, { xxx: { signature: "o m o m" } });
        expect(nodes).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [{ type: "string", content: "c" }],
                        openMark: "[",
                        closeMark: "]",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "d" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "e" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
            { type: "whitespace" },
            { type: "string", content: "f" },
        ]);

        // When given a group argument, extract the group
        nodes = strToNodes("\\xxx{c}");
        attachMacroArgsInArray(nodes, { xxx: { signature: "m" } });
        expect(nodes).toEqual([
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
        ]);

        // Find multiple occurrences
        nodes = strToNodes("\\xxx a b \\xxx{c}");
        attachMacroArgsInArray(nodes, { xxx: { signature: "m" } });
        expect(nodes).toEqual([
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
            { type: "whitespace" },
            { type: "string", content: "b" },
            { type: "whitespace" },
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
        ]);

        // embellishments
        nodes = strToNodes("\\xxx^a \\xxx_b");
        attachMacroArgsInArray(nodes, { xxx: { signature: "e{^_}" } });
        expect(nodes).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [{ type: "string", content: "a" }],
                        openMark: "^",
                        closeMark: "",
                    },
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    }
                ],
            },
            { type: "whitespace" },
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "b" }],
                        openMark: "_",
                        closeMark: "",
                    },
                ],
            },
        ])
    });
});
