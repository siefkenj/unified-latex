import util from "util";
import * as Ast from "../../unified-latex-types";
import { printRaw } from "../../unified-latex-util-print-raw";
import { expandUnicodeLigatures } from "../libs/expand-unicode-ligatures";
import { parseLigatures } from "../libs/parse";
import { strToNodes } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-ligatures", () => {
    it("can replace string ligatures", () => {
        let ast = strToNodes("a---b");
        expect(printRaw(parseLigatures(ast))).toEqual("a—b");
        ast = strToNodes("a--b");
        expect(printRaw(parseLigatures(ast))).toEqual("a–b");
        ast = strToNodes("a``b");
        expect(printRaw(parseLigatures(ast))).toEqual("a“b");
        ast = strToNodes("a''b");
        expect(printRaw(parseLigatures(ast))).toEqual("a”b");
        ast = strToNodes("a`b");
        expect(printRaw(parseLigatures(ast))).toEqual("a‘b");
        ast = strToNodes("a\\$b");
        expect(printRaw(parseLigatures(ast))).toEqual("a$b");
    });

    it("can replace macro ligatures", () => {
        let ast = strToNodes('a\\"ob');
        expect(printRaw(parseLigatures(ast))).toEqual("aöb");

        ast = strToNodes("a\\^ob");
        expect(printRaw(parseLigatures(ast))).toEqual("aôb");

        ast = strToNodes("a\\pounds b");
        expect(printRaw(parseLigatures(ast))).toEqual("a£ b");

        ast = strToNodes("a\\v sb");
        expect(printRaw(parseLigatures(ast))).toEqual("ašb");
    });

    it("can replace macro ligatures with an argument in a group", () => {
        let ast = strToNodes('a\\"{o}b');
        expect(printRaw(parseLigatures(ast))).toEqual("aöb");

        ast = strToNodes("a\\^{o}b");
        expect(printRaw(parseLigatures(ast))).toEqual("aôb");

        ast = strToNodes("a\\v{s}b");
        expect(printRaw(parseLigatures(ast))).toEqual("ašb");

        ast = strToNodes("a\\v {s}b");
        expect(printRaw(parseLigatures(ast))).toEqual("ašb");
    });

    it("expands ligatures in text mode but not math mode", () => {
        let ast = strToNodes("a\\&$\\&$b");
        expandUnicodeLigatures(ast);
        expect(printRaw(ast)).toEqual("a&$\\&$b");
    });

    it("expands whitespace ligatures", () => {
        let ast = strToNodes("a\\ b");
        expandUnicodeLigatures(ast);
        expect(printRaw(ast)).toEqual("a b");

        ast = strToNodes("a~b");
        expandUnicodeLigatures(ast);
        expect(printRaw(ast)).toEqual("a\u00A0b");

        ast = strToNodes("a\\,b");
        expandUnicodeLigatures(ast);
        expect(printRaw(ast)).toEqual("a\u2009b");
    });
    it.skip("expands removes extra whitespace after named whitespace commands", () => {
        let ast;
        ast = strToNodes("a\\quad b");
        expandUnicodeLigatures(ast);
        expect(printRaw(ast)).toEqual("a\u2003b");
    });
});
