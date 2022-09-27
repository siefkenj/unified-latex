import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";

import {
    hasReparsableMacroNames,
    hasReparsableMacroNamesInArray,
    reparseMacroNames,
    reparseMacroNamesInArray,
} from "../libs/reparse-macro-names";
import { strToNodesMinimal } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-utils-macros", () => {
    it("Can reparse macro names in array", () => {
        let parsed = strToNodesMinimal("\\foo@bar baz");

        expect((parsed[0] as Ast.Macro).content).toEqual("foo");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");

        parsed = strToNodesMinimal("\\@@foo@bar @baz");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("@@foo@bar");

        parsed = strToNodesMinimal("the \\@@foo@bar @baz");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[2] as Ast.Macro).content).toEqual("@@foo@bar");

        parsed = strToNodesMinimal("\\foo@bar and \\baz@@ba");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");
        expect((parsed[4] as Ast.Macro).content).toEqual("baz@@ba");

        parsed = strToNodesMinimal("\\latex_command_with:Nn");
        reparseMacroNamesInArray(parsed, new Set(["_", ":"]));
        expect((parsed[0] as Ast.Macro).content).toEqual(
            "latex_command_with:Nn"
        );
    });
    it("Can reparse macro names", () => {
        let parsed = strToNodesMinimal("\\foo@bar baz");

        expect((parsed[0] as Ast.Macro).content).toEqual("foo");
        reparseMacroNames(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");

        parsed = strToNodesMinimal("\\@@foo@bar @baz");
        reparseMacroNames(parsed, "@");
        expect((parsed[0] as Ast.Macro).content).toEqual("@@foo@bar");

        // Some nested subs
        parsed = strToNodesMinimal("{\\foo@bar {zzz \\mee@moo}}");
        reparseMacroNames(parsed, "@");
        expect(parsed).toEqual([
            {
                content: [
                    { content: "foo@bar", type: "macro" },
                    { type: "whitespace" },
                    {
                        content: [
                            { content: "zzz", type: "string" },
                            { type: "whitespace" },
                            { content: "mee@moo", type: "macro" },
                        ],
                        type: "group",
                    },
                ],
                type: "group",
            },
        ]);
    });
    it("Preserves original source boundaries when a reparse is done", () => {
        let parsed = strToNodesMinimal("\\foo@bar baz", true);

        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).position).toEqual({
            end: { column: 9, line: 1, offset: 8 },
            start: { column: 1, line: 1, offset: 0 },
        });
    });
    it("Can detect if reparsable macros exist", () => {
        let parsed = strToNodesMinimal("\\foo@bar baz");
        expect(
            hasReparsableMacroNamesInArray(parsed, new Set("@"))
        ).toBeTruthy();
        expect(
            hasReparsableMacroNamesInArray(parsed, new Set("_"))
        ).toBeFalsy();

        parsed = strToNodesMinimal("{\\foo@bar \\textbf{zzz \\mee@moo}}");
        expect(hasReparsableMacroNames(parsed, new Set("@"))).toBeTruthy();

        parsed = strToNodesMinimal("{\\foo@bar \\textbf{zzz \\mee_moo}}");
        expect(hasReparsableMacroNames(parsed, new Set("_"))).toBeTruthy();
        expect(hasReparsableMacroNames(parsed, new Set(":"))).toBeFalsy();
    });

    it("Don't include numbers during macro reparse", () => {
        let parsed = strToNodesMinimal("\\foo@bar2 baz");

        expect((parsed[0] as Ast.Macro).content).toEqual("foo");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("foo@bar");

        parsed = strToNodesMinimal("\\@2 @baz");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("@");

        parsed = strToNodesMinimal("\\@@foo@2ab @baz");
        reparseMacroNamesInArray(parsed, new Set("@"));
        expect((parsed[0] as Ast.Macro).content).toEqual("@@foo@");
    });

    it("Don't reparse math `_`", () => {
        let parsed = strToNodesMinimal("$_a$");
        reparseMacroNames(parsed, new Set("_"));
        let mathEnv = (parsed[0] as Ast.InlineMath).content[0] as Ast.Macro;

        expect(mathEnv).toEqual({
            content: "_",
            escapeToken: "",
            type: "macro",
        });
    });
});
