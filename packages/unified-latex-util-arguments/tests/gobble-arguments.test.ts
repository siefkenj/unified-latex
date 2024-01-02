import { describe, expect, it } from "vitest";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
import { gobbleArguments } from "../libs/gobble-arguments";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";
import { arg, s, SP } from "@unified-latex/unified-latex-builder";
import { strToNodesMinimal } from "../../test-common";
import { scan } from "@unified-latex/unified-latex-util-scan";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("can gobble mandatory arguments", () => {
        let argspec = parseArgspec("m m");
        value = "{val}x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "val" }],
                    openMark: "{",
                    closeMark: "}",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "x" }],
                    openMark: "{",
                    closeMark: "}",
                },
            ],
            nodesRemoved: 2,
        });
        expect(nodes).toEqual([
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "val" }],
                    openMark: "{",
                    closeMark: "}",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "x" }],
                    openMark: "{",
                    closeMark: "}",
                },
            ],

            nodesRemoved: 3,
        });
        expect(nodes).toEqual([
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);
    });

    it("can gobble arguments that represents multiple embellishments", () => {
        let argspec = parseArgspec("e{_ad}");
        value = "_{1234}abcde";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "1234" }],
                    openMark: "_",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "b" }],
                    openMark: "a",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [],
                    openMark: "",
                    closeMark: "",
                },
            ],
            nodesRemoved: 4,
        });
        expect(nodes).toEqual([{ type: "string", content: "cde" }]);

        // Order of embellishments shouldn't matter
        argspec = parseArgspec("e{_ad}");
        value = "_{1234}daac";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "1234" }],
                    openMark: "_",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "c" }],
                    openMark: "a",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "a" }],
                    openMark: "d",
                    closeMark: "",
                },
            ],
            nodesRemoved: 6,
        });
        expect(nodes).toEqual([]);

        // Whitespace between embellishment arguments should be ignored.
        argspec = parseArgspec("e{^_}");
        value = "^1 _2";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "1" }],
                    openMark: "^",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "2" }],
                    openMark: "_",
                    closeMark: "",
                },
            ],
            nodesRemoved: 5,
        });
        expect(nodes).toEqual([]);

        // Embellishment tokens enclosed in braces
        argspec = parseArgspec("e{{^}{_}}");
        value = "^a_b";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "a" }],
                    openMark: "^",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "b" }],
                    openMark: "_",
                    closeMark: "",
                },
            ],
            nodesRemoved: 4,
        });
        expect(nodes).toEqual([]);
    });

    it("can gobble arguments that represents multiple embellishments with default arguments", () => {
        let argspec = parseArgspec("E{^_}{{UP}{DOWN}}");

        value = "^{SuperscriptOnly}";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "SuperscriptOnly" }],
                    openMark: "^",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "DOWN" }],
                    openMark: "_",
                    closeMark: "",
                },
            ],
            nodesRemoved: 2,
        });
        expect(nodes).toEqual([]);

        value = "_{SubscriptOnly}";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleArguments(nodes, argspec)).toEqual({
            args: [
                {
                    type: "argument",
                    content: [{ type: "string", content: "UP" }],
                    openMark: "^",
                    closeMark: "",
                },
                {
                    type: "argument",
                    content: [{ type: "string", content: "SubscriptOnly" }],
                    openMark: "_",
                    closeMark: "",
                },
            ],
            nodesRemoved: 2,
        });
        expect(nodes).toEqual([]);
    });

    it("can gobble arguments with custom argument parser", () => {
        /**
         * Unconditionally take the first node as an argument.
         */
        function simpleParser(
            nodes: Ast.Node[],
            macroPos: number
        ): { args: Ast.Argument[]; nodesRemoved: number } {
            const args: Ast.Argument[] = [arg(nodes.shift()!)];
            return { args, nodesRemoved: 1 };
        }

        let nodes = strToNodesMinimal("{val}x x");
        expect(gobbleArguments(nodes, simpleParser)).toEqual({
            args: [arg([{ type: "group", content: [s("val")] }])],
            nodesRemoved: 1,
        });
        expect(nodes).toEqual([s("x"), SP, s("x")]);

        /**
         * Scan until an `"x"` is found.
         */
        function complexParser(
            nodes: Ast.Node[],
            macroPos: number
        ): { args: Ast.Argument[]; nodesRemoved: number } {
            const l = scan(nodes, "x", { startIndex: macroPos });
            if (l == null) {
                return {
                    args: [arg([], { openMark: "", closeMark: "" })],
                    nodesRemoved: 0,
                };
            }
            const args: Ast.Argument[] = [
                arg(nodes.splice(macroPos, l - macroPos)),
            ];
            return { args, nodesRemoved: l - macroPos };
        }
        nodes = strToNodesMinimal("{val} a b x x");
        expect(gobbleArguments(nodes, complexParser)).toEqual({
            args: [
                arg([
                    { type: "group", content: [s("val")] },
                    SP,
                    s("a"),
                    SP,
                    s("b"),
                    SP,
                ]),
            ],
            nodesRemoved: 6,
        });
        expect(nodes).toEqual([s("x"), SP, s("x")]);
    });
});
