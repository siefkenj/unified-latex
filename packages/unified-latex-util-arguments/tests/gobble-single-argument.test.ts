import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse as parseArgspec } from "../../unified-latex-util-argspec";
import { gobbleSingleArgument } from "../libs/gobble-single-argument";
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

    it("can gobble single mandatory argument", () => {
        let argspec = parseArgspec("m")[0];
        value = "{val}x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "val" }],
                openMark: "{",
                closeMark: "}",
            },
            nodesRemoved: 1,
        });
        expect(nodes).toEqual([
            { content: "x", type: "string" },
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "val" }],
                openMark: "{",
                closeMark: "}",
            },
            nodesRemoved: 1,
        });
        expect(nodes).toEqual([
            { type: "whitespace" },
            { content: "x", type: "string" },
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);
    });

    it("can gobble single optional argument", () => {
        let argspec = parseArgspec("o")[0];
        value = "[val xx]x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "val" },
                    { type: "whitespace" },
                    { type: "string", content: "xx" },
                ],
                openMark: "[",
                closeMark: "]",
            },
            nodesRemoved: 5,
        });
        expect(nodes).toEqual([
            { content: "x", type: "string" },
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: null,
            nodesRemoved: 0,
        });

        value = "]val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: null,
            nodesRemoved: 0,
        });

        value = "[val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
    });

    it("can gobble single star argument", () => {
        let argspec = parseArgspec("s")[0];
        value = "*x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "*" }],
                openMark: "",
                closeMark: "",
            },
            nodesRemoved: 1,
        });
        expect(nodes).toEqual([
            { content: "x", type: "string" },
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
    });

    it("can gobble single argument with custom braces", () => {
        let argspec = parseArgspec("r()")[0];
        value = "(val)x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "val" }],
                openMark: "(",
                closeMark: ")",
            },
            nodesRemoved: 3,
        });
        expect(nodes).toEqual([
            { content: "x", type: "string" },
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: null,
            nodesRemoved: 0,
        });

        // No closing brace, so it shouldn't be picked up
        value = "(val x x";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
    });

    it("gobbleSingleArgument gobbles arguments", () => {
        let ast: Ast.Node[] = [{ type: "whitespace" }, { type: "whitespace" }];
        // Don't match anything if we run out of tokens
        expect(gobbleSingleArgument(ast, parseArgspec("m")[0])).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
        expect(gobbleSingleArgument(ast, parseArgspec("o")[0])).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
        // ignores whitespace while consuming
        ast = [
            { type: "whitespace" },
            { type: "string", content: "x" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("m")[0])).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "x" }],
                openMark: "{",
                closeMark: "}",
            },
            nodesRemoved: 2,
        });
        expect(gobbleSingleArgument(ast, parseArgspec("o")[0])).toEqual({
            argument: null,
            nodesRemoved: 0,
        });

        // unwraps groups detected as arguments
        ast = [
            { type: "group", content: [{ type: "string", content: "x" }] },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("m")[0])).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "x" }],
                openMark: "{",
                closeMark: "}",
            },
            nodesRemoved: 1,
        });
        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: "]" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("o")[0])).toEqual({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "group",
                        content: [{ type: "string", content: "b" }],
                    },
                    { type: "string", content: "c" },
                ],
                openMark: "[",
                closeMark: "]",
            },
            nodesRemoved: 6,
        });
        // optional argument missing closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "a" },
            { type: "string", content: "b" },
            { type: "string", content: "c" },
            { type: "string", content: "d" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("o")[0])).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
        // optional star argument
        ast = [
            { type: "string", content: "*" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("s")[0])).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "*" }],
                openMark: "",
                closeMark: "",
            },
            nodesRemoved: 1,
        });
        ast = [
            { type: "whitespace" },
            { type: "string", content: "*" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("s")[0])).toEqual({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "*" }],
                openMark: "",
                closeMark: "",
            },
            nodesRemoved: 2,
        });
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("s")[0])).toEqual({
            argument: null,
            nodesRemoved: 0,
        });
    });

    it("gobbleSingleArgument gobbles complex arguments", () => {
        let ast: Ast.Node[] = [{ type: "whitespace" }, { type: "whitespace" }];
        // Don't match anything if we run out of tokens
        expect(gobbleSingleArgument(ast, parseArgspec("r()")[0])).toMatchObject(
            {
                argument: null,
                nodesRemoved: 0,
            }
        );
        expect(gobbleSingleArgument(ast, parseArgspec("d()")[0])).toMatchObject(
            {
                argument: null,
                nodesRemoved: 0,
            }
        );

        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "string", content: "(" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: ")" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("d()")[0])).toMatchObject(
            {
                argument: {
                    type: "argument",
                    content: [
                        { type: "string", content: "a" },
                        {
                            type: "group",
                            content: [{ type: "string", content: "b" }],
                        },
                        { type: "string", content: "c" },
                    ],
                    openMark: "(",
                    closeMark: ")",
                },
                nodesRemoved: 6,
            }
        );

        // optional argument missing closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "(" },
            { type: "string", content: "a" },
            { type: "string", content: "b" },
            { type: "string", content: "c" },
            { type: "string", content: "d" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("d()")[0])).toMatchObject(
            {
                argument: null,
                nodesRemoved: 0,
            }
        );

        // same opening and closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "!" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: "!" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("d!!")[0])).toMatchObject(
            {
                argument: {
                    type: "argument",
                    content: [
                        { type: "string", content: "a" },
                        {
                            type: "group",
                            content: [{ type: "string", content: "b" }],
                        },
                        { type: "string", content: "c" },
                    ],
                    openMark: "!",
                    closeMark: "!",
                },
                nodesRemoved: 6,
            }
        );
    });
    it("gobbleSingleArgument gobbles optional token", () => {
        let ast: Ast.Node[];

        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "string", content: "+" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: ")" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument([...ast], parseArgspec("t+")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "+" }],
                openMark: "",
                closeMark: "",
            },
            nodesRemoved: 2,
        });
        expect(
            gobbleSingleArgument([...ast], parseArgspec("!t+")[0])
        ).toMatchObject({
            argument: null,
            nodesRemoved: 0,
        });
    });
    it("gobbleSingleArgument gobbles optional group (i.e., optional argument in '{...}' braces)", () => {
        let ast: Ast.Node[];

        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: ")" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument([...ast], parseArgspec("d{}")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "b" }],
                openMark: "{",
                closeMark: "}",
            },
            nodesRemoved: 2,
        });

        // The argument shouldn't be gobbled if we forbid whitespace in front of it.
        expect(
            gobbleSingleArgument([...ast], parseArgspec("!d{}")[0])
        ).toMatchObject({
            argument: null,
            nodesRemoved: 0,
        });
        
        ast = [
            { type: "string", content: "a" },
            { type: "whitespace" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: ")" },
            { type: "string", content: "y" },
        ];
        // Unlike a mandatory argument, we don't gobble an optional argument without braces.
        expect(
            gobbleSingleArgument([...ast], parseArgspec("!d{}")[0])
        ).toMatchObject({
            argument: null,
            nodesRemoved: 0,
        });
    });
    it("gobbleSingleArgument won't gobble if whitespace is not permitted", () => {
        let ast: Ast.Node[];

        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "c" },
            { type: "string", content: "]" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument([...ast], parseArgspec("!o")[0])
        ).toMatchObject({
            argument: null,
            nodesRemoved: 0,
        });
        expect(
            gobbleSingleArgument([...ast], parseArgspec("o")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "c" }],
                openMark: "[",
                closeMark: "]",
            },
            nodesRemoved: 4,
        });
    });
});
