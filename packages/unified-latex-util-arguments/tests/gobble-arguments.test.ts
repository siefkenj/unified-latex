import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "../../unified-latex-util-argspec";
import { gobbleArguments } from "../libs/gobble-arguments";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";

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
});
