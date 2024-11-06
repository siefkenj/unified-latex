import { describe, it, expect } from "vitest";
import { VFile } from "vfile";
import util from "util";
import * as argspecParser from "../index";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

function removeWhitespace(x: string) {
    return x.replace(/\s+/g, "");
}

describe("unified-latex-util-argspec", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    let ast: ReturnType<typeof argspecParser.parse>;

    const SPEC_STRINGS = [
        "",
        "o m",
        "o m o !o m",
        "!o r() m",
        "O{somedefault} m o",
        "m e{^}",
        "m e{_^}",
        "s m",
        "v!",
        "d++ D--{def}",
        "O{nested{defaults}}",
        "m ta o o",
        "u{xx;}",
        "u;",
        "u{ }",
        "r\\abc\\d",
        "R\\a1{default}",
    ];

    for (const spec of SPEC_STRINGS) {
        it(`parses xparse argument specification string "${spec}"`, () => {
            const ast = argspecParser.parse(spec);
            expect(ast).toMatchSnapshot();
            expect(argspecParser.printRaw(ast, true)).toEqual(spec);
        });
    }

    it("Default args need not be enclosed in braces", () => {
        ast = argspecParser.parse("Ox");
        expect(ast).toEqual([
            {
                closeBrace: "]",
                defaultArg: "x",
                openBrace: "[",
                type: "optional",
            },
        ]);

        ast = argspecParser.parse("D(ab");
        expect(ast).toEqual([
            {
                closeBrace: "a",
                defaultArg: "b",
                openBrace: "(",
                type: "optional",
            },
        ]);
    });

    it("Embellishment tokens can be single characters specified without a group", () => {
        ast = argspecParser.parse("e^");
        expect(ast).toEqual([
            {
                type: "embellishment",
                embellishmentTokens: ["^"],
            },
        ]);

        // Macros count as a single token
        ast = argspecParser.parse("e\\foo");
        expect(ast).toEqual([
            {
                type: "embellishment",
                embellishmentTokens: ["\\foo"],
            },
        ]);

        ast = argspecParser.parse("Ex{}");
        expect(ast).toEqual([
            {
                type: "embellishment",
                embellishmentTokens: ["x"],
                defaultArg: [],
            },
        ]);
    });

    it("Embellishment tokens ignore whitespace", () => {
        ast = argspecParser.parse("e { ^ }");
        expect(ast).toEqual([
            {
                type: "embellishment",
                embellishmentTokens: ["^"],
            },
        ]);
    });

    it("Embellishment default args can be a mix of tokens and groups", () => {
        ast = argspecParser.parse("E{\\token^}{{D1}2}");
        expect(ast).toEqual([
            {
                defaultArg: ["D1", "2"],
                embellishmentTokens: ["\\token", "^"],
                type: "embellishment",
            },
        ]);
    });

    it("Embellishments always return a string", () => {
        ast = argspecParser.parse("e{{x}y{z}}");
        expect(ast).toEqual([
            { type: "embellishment", embellishmentTokens: ["x", "y", "z"] },
        ]);
        ast = argspecParser.parse("E{{x}y{z}}{}");
        expect(ast).toEqual([
            {
                type: "embellishment",
                embellishmentTokens: ["x", "y", "z"],
                defaultArg: [],
            },
        ]);
    });
    it("Embellishments keep default args", () => {
        ast = argspecParser.parse("E{{x}y{z}}{{One}{Two}{Three}}");
        expect(ast).toEqual([
            {
                type: "embellishment",
                embellishmentTokens: ["x", "y", "z"],
                defaultArg: ["One", "Two", "Three"],
            },
        ]);
    });
});
