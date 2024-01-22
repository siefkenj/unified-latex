import { describe, it, expect } from "vitest";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import * as argspecParser from "..";

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

    const SPEC_STRINGS = [
        "",
        "o m",
        "o m o !o m",
        "!o r() m",
        "O{somedefault} m o",
        "m e^",
        "m e{_^}",
        "s m",
        "v!",
        "d++ D--{def}",
        "O{nested{defaults}}",
        "m ta o o",
        "u{xx;}",
        "u;",
        "u{ }",
        "Ox",
        "r\\abc\\d",
        "R\\a1{default}",
        "D(ab",
        "E{\\token ^}{{D1}2}",
    ];

    for (const spec of SPEC_STRINGS) {
        it(`parses xparse argument specification string "${spec}"`, () => {
            const ast = argspecParser.parse(spec);
            expect(ast).toMatchSnapshot();
            expect(argspecParser.printRaw(ast, true)).toEqual(spec);
        });
    }

    it("Embellishments always return a string", () => {
        let ast = argspecParser.parse("e{{x}y{z}}");
        expect(ast).toEqual([
            { type: "embellishment", tokens: ["x", "y", "z"] },
        ]);
        ast = argspecParser.parse("E{{x}y{z}}{{One}{Two}{Three}}");
        expect(ast).toEqual([
            {
                type: "embellishment",
                tokens: ["x", "y", "z"],
                defaultArgs: ["One", "Two", "Three"],
            },
        ]);
    });
});
