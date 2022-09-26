import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";

import {
    hasReparsableMacroNames,
    hasReparsableMacroNamesInArray,
    reparseMacroNames,
    reparseMacroNamesInArray,
} from "../libs/reparse-macro-names";
import { strToNodes } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-utils-macros", () => {
    it("Can reparse macro names in array", () => {
        let parsed = strToNodes("\\foo@bar baz");

        expect((parsed[0] as Ast.Macro).content).toEqual("foo");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");

        parsed = strToNodes("\\@@foo@bar @baz");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("@@foo@bar");

        parsed = strToNodes("the \\@@foo@bar @baz");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[2] as Ast.Macro).content).toEqual("@@foo@bar");

        parsed = strToNodes("\\foo@bar and \\baz@@ba");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");
        expect((parsed[4] as Ast.Macro).content).toEqual("baz@@ba");

        parsed = strToNodes("\\latex_command_with:Nn");
        reparseMacroNamesInArray(parsed, new Set(["_", ":"]));
        expect((parsed[0] as Ast.Macro).content).toEqual(
            "latex_command_with:Nn"
        );
    });
    it("Can reparse macro names", () => {
        let parsed = strToNodes("\\foo@bar baz");

        expect((parsed[0] as Ast.Macro).content).toEqual("foo");
        reparseMacroNames(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");

        parsed = strToNodes("\\@@foo@bar @baz");
        reparseMacroNames(parsed, "@");
        expect((parsed[0] as Ast.Macro).content).toEqual("@@foo@bar");

        // Some nested subs
        parsed = strToNodes("{\\foo@bar \\textbf{zzz \\mee@moo}}");
        reparseMacroNames(parsed, "@");
        expect(parsed).toEqual([
            {
                content: [
                    { content: "foo@bar", type: "macro" },
                    { type: "whitespace" },
                    {
                        args: [
                            {
                                closeMark: "}",
                                content: [
                                    { content: "zzz", type: "string" },
                                    { type: "whitespace" },
                                    { content: "mee@moo", type: "macro" },
                                ],
                                openMark: "{",
                                type: "argument",
                            },
                        ],
                        content: "textbf",
                        type: "macro",
                    },
                ],
                type: "group",
            },
        ]);
    });
    it("Preserves original source boundaries when a reparse is done", () => {
        let parsed = strToNodes("\\foo@bar baz", true);

        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).position).toEqual({
            end: { column: 9, line: 1, offset: 8 },
            start: { column: 1, line: 1, offset: 0 },
        });
    });
    it("Can detect if reparsable macros exist", () => {
        let parsed = strToNodes("\\foo@bar baz");
        expect(
            hasReparsableMacroNamesInArray(parsed, new Set("@"))
        ).toBeTruthy();
        expect(
            hasReparsableMacroNamesInArray(parsed, new Set("_"))
        ).toBeFalsy();

        parsed = strToNodes("{\\foo@bar \\textbf{zzz \\mee@moo}}");
        expect(hasReparsableMacroNames(parsed, new Set("@"))).toBeTruthy();

        parsed = strToNodes("{\\foo@bar \\textbf{zzz \\mee_moo}}");
        expect(hasReparsableMacroNames(parsed, new Set("_"))).toBeTruthy();
        expect(hasReparsableMacroNames(parsed, new Set(":"))).toBeFalsy();
    });
});
