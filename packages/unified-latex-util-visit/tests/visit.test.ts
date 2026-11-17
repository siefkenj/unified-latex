import { VFile } from "vfile";
import util from "util";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import * as Ast from "@unified-latex/unified-latex-types";
import { parse } from "../../unified-latex-util-parse";
import { visit, VisitInfo } from "../libs/visit";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-visit", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("passes in `inMathMode` context while walking", () => {
        let ast = parse("a $b^{e}$ c");
        let expected = ["b^{e}", "{e}", "e"];
        let received: string[] = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a \\[b^{e}\\] c");
        expected = ["b^{e}", "{e}", "e"];
        received = [];

        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a \\begin{align}b^{e}\\end{align} c");
        expected = ["b^{e}", "{e}", "e"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a $b$ c $d$");
        expected = ["b", "d"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
    });

    it("passes in `inMathMode` context while walking nested structures", () => {
        let ast = parse("a $b\\text{some $math$}$ c");
        let expected = ["b\\text{some $math$}", "math"];
        let received: string[] = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a $b\\text{some $math\\text{deep$x$}$}$ c");
        expected = [
            "b\\text{some $math\\text{deep$x$}$}",
            "math\\text{deep$x$}",
            "x",
        ];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);
    });
    it("passes in `inMathMode` context for arguments with their own mode", () => {
        const arg = (content: string, inMathMode?: boolean): Ast.Argument => ({
            type: "argument",
            content: [{ type: "string", content }],
            openMark: "{",
            closeMark: "}",
            ...(inMathMode == null ? {} : { _renderInfo: { inMathMode } }),
        });
        const ast: Ast.Root = {
            type: "root",
            content: [
                {
                    type: "inlinemath",
                    content: [
                        {
                            type: "macro",
                            content: "textcolor",
                            args: [arg("blue", false), arg("x")],
                        },
                    ],
                },
                {
                    type: "macro",
                    content: "xxx",
                    args: [arg("y", true), arg("z")],
                },
            ],
        };
        const modes: Record<string, [boolean?, boolean?]> = {};
        visit(ast, (node, info) => {
            if (node.type === "string") {
                modes[node.content] = [
                    info.context.inMathMode,
                    info.context.hasMathModeAncestor,
                ];
            }
        });
        expect(modes).toEqual({
            blue: [false, true],
            x: [true, true],
            y: [true, true],
            z: [false, false],
        });
    });
    it("passes in `inMathMode` context for the body of a `mathenv` without render info", () => {
        const ast: Ast.Root = {
            type: "root",
            content: [
                {
                    type: "mathenv",
                    env: "equation",
                    content: [{ type: "string", content: "x" }],
                },
            ],
        };
        const modes: Record<string, boolean | undefined> = {};
        visit(ast, (node, info) => {
            if (node.type === "string") {
                modes[node.content] = info.context.inMathMode;
            }
        });
        expect(modes).toEqual({ x: true });
    });
    it("passes in text mode context for the arguments of environments", () => {
        const arg = (
            content: string,
            openMark = "{",
            closeMark = "}"
        ): Ast.Argument => ({
            type: "argument",
            content: [{ type: "string", content }],
            openMark,
            closeMark,
        });
        const ast: Ast.Root = {
            type: "root",
            content: [
                {
                    type: "mathenv",
                    env: "equation",
                    content: [
                        {
                            type: "environment",
                            env: "array",
                            args: [arg("cc")],
                            content: [{ type: "string", content: "x" }],
                        },
                    ],
                },
                {
                    type: "environment",
                    env: "aligned",
                    args: [arg("t", "[", "]")],
                    content: [{ type: "string", content: "y" }],
                    _renderInfo: { inMathMode: true },
                },
            ],
        };
        const modes: Record<string, boolean | undefined> = {};
        visit(ast, (node, info) => {
            if (node.type === "string") {
                modes[node.content] = info.context.inMathMode;
            }
        });
        expect(modes).toEqual({ cc: false, x: true, t: false, y: true });
    });
    it("issue #30 test function that accepts optional type should infer correctly", () => {
        // This issue cannot be checked by Jest because it is an issue related to typescript
        // types. It must be tested manually
        let ast = parse("");
        const testFunc1 = ((node: any) => false) as (
            node: any
        ) => node is Ast.Group;
        const testFunc2 = ((node: any, info: any) => false) as (
            node: any,
            info: VisitInfo
        ) => node is Ast.Group;
        const testFunc3 = ((node: any, info: any, other?: any) => false) as (
            node: any,
            info: VisitInfo,
            other?: any
        ) => node is Ast.Group;

        visit(
            ast,
            (nodes) => {
                // CHECK: inferred type of `node` should be `Ast.Group`
            },
            {
                test: testFunc1,
            }
        );
        visit(
            ast,
            (nodes) => {
                // CHECK: inferred type of `node` should be `Ast.Group`
            },
            {
                test: testFunc2,
            }
        );
        visit(
            ast,
            (nodes) => {
                // CHECK: inferred type of `node` should be `Ast.Group`
            },
            {
                test: testFunc3,
            }
        );
    });
});
