import { describe, expect, it } from "vitest";
import { VFile } from "vfile";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import type * as Ast from "../../unified-latex-types/index";
import { parse as parseArgspec } from "@unified-latex/unified-latex-util-argspec";
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

        // non-punctuation optional token
        ast = [{ type: "whitespace" }, { type: "string", content: "_abc" }];
        expect(
            gobbleSingleArgument([...ast], parseArgspec("t_")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "_" }],
                openMark: "",
                closeMark: "",
            },
            nodesRemoved: 2,
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

    it("can gobble an 'until' argument", () => {
        let argspec = parseArgspec("u)")[0];
        value = "(val)x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "(" },
                    { type: "string", content: "val" },
                ],
                openMark: "",
                closeMark: ")",
            },
            nodesRemoved: 3,
        });
        expect(nodes).toEqual([
            { content: "x", type: "string" },
            { type: "whitespace" },
            { content: "x", type: "string" },
        ]);

        value = "(val)";
        file = processLatexToAstViaUnified().processSync({ value });
        nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "(" },
                    { type: "string", content: "val" },
                ],
                openMark: "",
                closeMark: ")",
            },
            nodesRemoved: 3,
        });
        expect(nodes).toEqual([]);
    });
    it("can gobble an 'until' argument with a whitespace stop", () => {
        let argspec = parseArgspec("u{ }")[0];
        value = "(val)x x";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "(" },
                    { type: "string", content: "val" },
                    { content: ")", type: "string" },
                    { content: "x", type: "string" },
                ],
                openMark: "",
                closeMark: " ",
            },
            nodesRemoved: 5,
        });
        expect(nodes).toEqual([{ content: "x", type: "string" }]);
    });
    it("can gobble an 'until' that requires splitting a string", () => {
        let argspec = parseArgspec("ux")[0];
        value = "(val)mxyx";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "(" },
                    { type: "string", content: "val" },
                    { content: ")", type: "string" },
                    { content: "m", type: "string" },
                ],
                openMark: "",
                closeMark: "x",
            },
            nodesRemoved: 5,
        });
        expect(nodes).toEqual([{ content: "yx", type: "string" }]);
    });
    it("gobbleSingleArgument gobbles non-punctuation delimited arguments", () => {
        let ast: Ast.Node[] = [
            { type: "whitespace" },
            { type: "string", content: "_a__" }, // additional delimiter should be ignored
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "!" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("r__")[0])).toMatchObject(
            {
                argument: {
                    type: "argument",
                    content: [{ type: "string", content: "a" }],
                    openMark: "_",
                    closeMark: "_",
                },
                nodesRemoved: 4,
            }
        );

        ast = [
            { type: "whitespace" },
            { type: "string", content: "^ab" },
            { type: "string", content: "!" },
            { type: "string", content: "b" },
            { type: "whitespace" },
            { type: "string", content: "d" },
            { type: "string", content: "y_" },
        ];
        expect(
            gobbleSingleArgument(ast, parseArgspec("R^_{default}")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [
                    { type: "string", content: "ab" },
                    { type: "string", content: "!" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    { type: "string", content: "d" },
                    { type: "string", content: "y" },
                ],
                openMark: "^",
                closeMark: "_",
            },
            nodesRemoved: 9,
        });

        // Optional arguments are optional
        ast = [
            { type: "whitespace" },
            { type: "string", content: "ThisPreventsMatchingOptionalArg_" },
            { type: "whitespace" },
            { type: "string", content: "1" },
            { type: "string", content: "-" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("d_-")[0])).toMatchObject(
            {
                argument: null,
                nodesRemoved: 0,
            }
        );

        // missing closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "^ab" },
            { type: "string", content: "!" },
            { type: "string", content: "b" },
            { type: "string", content: "c" },
            { type: "string", content: "d" },
            { type: "string", content: "y" },
        ];
        expect(gobbleSingleArgument(ast, parseArgspec("r^_")[0])).toMatchObject(
            {
                argument: null,
                nodesRemoved: 0,
            }
        );

        // closing delimiter in the middle
        ast = [{ type: "string", content: "_a^_^" }];
        expect(gobbleSingleArgument(ast, parseArgspec("r__")[0])).toMatchObject(
            {
                argument: {
                    type: "argument",
                    content: [{ type: "string", content: "a^" }],
                    openMark: "_",
                    closeMark: "_",
                },
                nodesRemoved: 3,
            }
        );
    });
    it("can gobble embellishments", () => {
        let ast: Ast.Node[] = [{ type: "string", content: "xxx" }];
        expect(gobbleSingleArgument(ast, parseArgspec("e{}")[0])).toMatchObject(
            {
                argument: null,
                nodesRemoved: 0,
            }
        );

        ast = [
            { type: "whitespace" },
            { type: "string", content: "_1234" },
            { type: "string", content: "!" },
        ];
        expect(
            gobbleSingleArgument(ast, parseArgspec("e{_}")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "1" }],
                openMark: "_",
                closeMark: "",
            },
            nodesRemoved: 3,
        });

        ast = [
            { type: "string", content: "_" },
            { type: "group", content: [{ type: "string", content: "1234" }] },
            { type: "string", content: "abcde" },
        ];
        expect(
            gobbleSingleArgument(ast, parseArgspec("e{a_}")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "1234" }],
                openMark: "_",
                closeMark: "",
            },
            nodesRemoved: 2,
        });
    });
    it("can gobble embellishments whose token is in a group one level deep", () => {
        let ast: Ast.Node[] = [{ type: "string", content: "^a_b" }];
        expect(
            gobbleSingleArgument(ast, parseArgspec("e{{^}{_}}")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "a" }],
                openMark: "^",
                closeMark: "",
            },
            nodesRemoved: 2,
        });
    });
    it("can skip optional argument with default argument", () => {
        const expectNoMatch = (ast: Ast.Node[]) => {
            expect(
                gobbleSingleArgument(ast, parseArgspec("O{default}")[0])
            ).toMatchObject({
                argument: null,
                nodesRemoved: 0,
            });

            expect(
                gobbleSingleArgument(ast, parseArgspec("D(){\\LaTeX}")[0])
            ).toMatchObject({
                argument: null,
                nodesRemoved: 0,
            });

            expect(
                gobbleSingleArgument(ast, parseArgspec("R^_{default}")[0])
            ).toMatchObject({
                argument: null,
                nodesRemoved: 0,
            });
        };

        expectNoMatch([{ type: "string", content: "this_should_not_match" }]);
        expectNoMatch([{ type: "whitespace" }, { type: "parbreak" }]);
        expectNoMatch([]);
    });
    it.skip("gobbleSingleArgument gobbles arguments delimited by tokens", () => {
        let ast: Ast.Node[] = [
            { type: "macro", content: "a" },
            { type: "group", content: [{ type: "string", content: "123" }] },
            { type: "string", content: "1" },
        ];
        expect(
            gobbleSingleArgument(ast, parseArgspec("r\\a{ 1 }")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [
                    {
                        type: "group",
                        content: [{ type: "string", content: "123" }],
                    },
                ],
                openMark: "\\a",
                closeMark: "1",
            },
            nodesRemoved: 3,
        });

        ast = [
            { type: "macro", content: "abc" },
            { type: "string", content: "123" },
            { type: "macro", content: "def" },
        ];
        expect(
            gobbleSingleArgument(ast, parseArgspec("r\\abc\\def")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "123" }],
                openMark: "\\abc",
                closeMark: "\\def",
            },
            nodesRemoved: 3,
        });
    });
    // XXX: Test copied from PR #62. Output should be updated when `until` arguments
    // are more properly implemented.
    it.skip("can gobble an 'until' argument with multiple stop tokens", () => {
        let argspec = parseArgspec("u{| \\stop}")[0];
        value = "|ThisBarIsNotAStop|{Token}This| \\stop Is.";
        file = processLatexToAstViaUnified().processSync({ value });
        let nodes = trimRenderInfo((file.result as any).content) as Ast.Node[];
        expect(gobbleSingleArgument(nodes, argspec)).toEqual({
            argument: {
                type: "argument",
                content: [
                    // Due to a current implementation of gobbleSingleArgument,
                    // we may introduce extra string split during the search.
                    { type: "string", content: "|" },
                    { type: "string", content: "ThisBarIsNotAStop" },
                    { type: "string", content: "|" },
                    {
                        type: "group",
                        content: [{ type: "string", content: "Token" }],
                    },
                    { type: "string", content: "This" },
                ],
                openMark: "",
                closeMark: "| \\stop",
            },
            nodesRemoved: 8,
        });
        expect(nodes).toEqual([
            { type: "whitespace" },
            { type: "string", content: "Is" },
            { type: "string", content: "." },
        ]);
    });
});
