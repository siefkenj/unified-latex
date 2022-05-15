import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { processEnvironments } from "../libs/process-environment";
import { strToNodes } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-environments", () => {
    it("attach one mandatory argument to an environment", () => {
        let targetAst;
        let ast = strToNodes("\\begin{xxx}\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).toEqual([
            {
                type: "environment",
                env: "xxx",
                content: [],
                args: [
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                ],
            },
        ]);

        ast = strToNodes("\\begin{xxx}a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        targetAst = [
            {
                type: "environment",
                env: "xxx",
                content: [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
                args: [
                    {
                        type: "argument",
                        content: [{ type: "string", content: "a" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
        ];
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx} a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}%\n{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).not.toEqual(targetAst);
    });

    it("attach two mandatory argument to an environment", () => {
        let targetAst;
        let ast = strToNodes("\\begin{xxx}\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).toEqual([
            {
                type: "environment",
                env: "xxx",
                content: [],
                args: [
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                ],
            },
        ]);

        ast = strToNodes("\\begin{xxx}a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        targetAst = [
            {
                type: "environment",
                env: "xxx",
                content: [
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
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
        ];
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx} a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}%\n{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).not.toEqual(targetAst);
    });

    it("attach optional and mandatory argument to an environment", () => {
        let targetAst;
        let ast = strToNodes("\\begin{xxx}\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        expect(ast).toEqual([
            {
                type: "environment",
                env: "xxx",
                content: [],
                args: [
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                ],
            },
        ]);

        ast = strToNodes("\\begin{xxx}[a] b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        targetAst = [
            {
                type: "environment",
                env: "xxx",
                content: [
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
                args: [
                    {
                        type: "argument",
                        content: [{ type: "string", content: "a" }],
                        openMark: "[",
                        closeMark: "]",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "b" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
        ];
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx} [a] b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}[a] {b} c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        expect(ast).toEqual(targetAst);
    });

    it("environment's body is processed to remove surrounding whitespace", () => {
        let ast = strToNodes("\\begin{xxx}\n\nx\n\\end{xxx}");
        let targetAst: Ast.Node[] = [
            {
                type: "environment",
                env: "xxx",
                content: [{ type: "string", content: "x" }],
            },
        ];
        expect(ast).toEqual(targetAst);

        // parbreaks after sameline leading comments are removed
        ast = strToNodes("\\begin{xxx}%\n\nx\n\\end{xxx}");
        targetAst = [
            {
                type: "environment",
                env: "xxx",
                content: [
                    {
                        type: "comment",
                        content: "",
                        suffixParbreak: false,
                        sameline: true,
                        leadingWhitespace: false,
                    },
                    { type: "string", content: "x" },
                ],
            },
        ];
        expect(ast).toEqual(targetAst);

        // no whitespace is included after sameline leading comment
        ast = strToNodes("\\begin{xxx}%\nx\n\\end{xxx}");
        targetAst = [
            {
                type: "environment",
                env: "xxx",
                content: [
                    {
                        type: "comment",
                        content: "",
                        suffixParbreak: false,
                        sameline: true,
                        leadingWhitespace: false,
                    },
                    { type: "string", content: "x" },
                ],
            },
        ];

        expect(ast).toEqual(targetAst);
    });
});
