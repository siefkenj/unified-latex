import util from "util";
import { trim } from "..";
import { strToNodes } from "../../test-common";
import * as Ast from "@unified-latex/unified-latex-types";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const A_PRE_TRIM: Ast.Node[] = [
    { type: "whitespace" },
    { type: "string", content: "a" },
    { type: "parbreak" },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: true,
    },
    { type: "whitespace" },
    { type: "string", content: "b" },
    { type: "whitespace" },
    { type: "string", content: "c" },
    { type: "whitespace" },
    { type: "parbreak" },
];
const A_POST_TRIM: Ast.Node[] = [
    { type: "string", content: "a" },
    { type: "parbreak" },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: true,
    },
    { type: "whitespace" },
    { type: "string", content: "b" },
    { type: "whitespace" },
    { type: "string", content: "c" },
];
const B_PRE_TRIM: Ast.Node[] = [
    {
        type: "comment",
        content: "x",
        sameline: true,
        leadingWhitespace: true,
    },
    { type: "string", content: "a" },
    { type: "whitespace" },
    { type: "string", content: "b" },
    { type: "whitespace" },
    { type: "string", content: "c" },
    { type: "parbreak" },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: true,
    },
];
const B_POST_TRIM: Ast.Node[] = [
    {
        type: "comment",
        content: "x",
        sameline: true,
        leadingWhitespace: false,
    },
    { type: "string", content: "a" },
    { type: "whitespace" },
    { type: "string", content: "b" },
    { type: "whitespace" },
    { type: "string", content: "c" },
    { type: "parbreak" },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: false,
    },
];
const C_PRE_TRIM: Ast.Node[] = [
    { type: "parbreak" },
    {
        type: "comment",
        content: "x",
        sameline: true,
        leadingWhitespace: true,
    },
    { type: "string", content: "a" },
    { type: "whitespace" },
    { type: "string", content: "b" },
    { type: "whitespace" },
    { type: "string", content: "c" },
    { type: "parbreak" },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: true,
    },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: true,
    },
    { type: "parbreak" },
];
const C_POST_TRIM: Ast.Node[] = [
    {
        type: "comment",
        content: "x",
        sameline: false,
        leadingWhitespace: false,
    },
    { type: "string", content: "a" },
    { type: "whitespace" },
    { type: "string", content: "b" },
    { type: "whitespace" },
    { type: "string", content: "c" },
    { type: "parbreak" },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: false,
    },
    {
        type: "comment",
        content: "",
        sameline: false,
        leadingWhitespace: false,
    },
];

describe("unified-latex-trim", () => {
    it("can trim", () => {
        let x = [...A_PRE_TRIM];
        expect(trim(x)).toEqual({ trimmedEnd: 2, trimmedStart: 1 });
        expect(x).toEqual(A_POST_TRIM);

        x = [...B_PRE_TRIM];
        expect(trim(x)).toEqual({ trimmedEnd: 0, trimmedStart: 0 });
        expect(x).toEqual(B_POST_TRIM);

        x = [...C_PRE_TRIM];
        expect(trim(x)).toEqual({ trimmedEnd: 1, trimmedStart: 1 });
        expect(x).toEqual(C_POST_TRIM);
    });

    it("trims whitespace/parbreaks", () => {
        const targetAst = strToNodes("a b c");

        // trim left
        let ast = strToNodes(" a b c");
        trim(ast);
        expect(ast).toEqual(targetAst);

        // trim right
        ast = strToNodes("a b c ");
        trim(ast);
        expect(ast).toEqual(targetAst);

        // trim parbreak
        ast = strToNodes("\n\n\na b c ");
        trim(ast);
        expect(ast).toEqual(targetAst);

        // trim left and right
        ast = strToNodes("\n\n\na b c\n\n ");
        trim(ast);
        expect(ast).toEqual(targetAst);

        // trim everything when there is only whitespace
        ast = strToNodes("\n \n\n ");
        trim(ast);
        expect(ast).toEqual([]);
    });

    it("trims whitespace in front of comments where appropriate", () => {
        let targetAst = strToNodes("%x");
        let ast = strToNodes(" %x");
        trim(ast);
        expect(ast).toEqual(targetAst);

        targetAst = strToNodes("x%x").slice(1);
        ast = strToNodes("x %x").slice(1);
        trim(ast);
        expect(ast).toEqual(targetAst);

        targetAst = strToNodes("%x");
        ast = strToNodes("x\n\n%x").slice(1);
        trim(ast);
        expect(ast).toEqual(targetAst);

        targetAst = strToNodes("%x\n y");
        ast = strToNodes("x\n\n %x\n y").slice(1);
        trim(ast);
        expect(ast).toEqual(targetAst);
    });
});
