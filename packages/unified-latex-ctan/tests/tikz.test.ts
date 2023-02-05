import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { strToNodes } from "../../test-common";
import { arg, args, m } from "@unified-latex/unified-latex-builder";
import { parse as tikzParse, printRaw as tikzPrintRaw } from "../package/tikz";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-ctan:tikz", () => {
    describe("Can parse and print path body", () => {
        const EXAMPLES: [string, string][] = [
            ["(0,0) --  (1,1)", "(0,0) -- (1,1)"],
            [
                " [color=red] (1,1) -- (2,0) -- (3,1)",
                "[color=red] (1,1) -- (2,0) -- (3,1)",
            ],
            ["(0,0) rectangle +(1,1)", "(0,0) rectangle +(1,1)"],
            [
                "(0,0) -- (1,1) [c] -- (3,2) [c]",
                "(0,0) -- (1,1) [c] -- (3,2) [c]",
            ],
            ["(a.north) |- (b.west)", "(a.north) |- (b.west)"],
            [".. controls (1,1) ..", ".. controls (1,1) .."],
            [
                ".. controls (1,1) and   (2,3) ..",
                ".. controls (1,1) and (2,3) ..",
            ],
            [
                "svg [scale=2] {h 10 v 10 h -10}",
                "svg[scale=2] {h 10 v 10 h -10}",
            ],
            [
                "foreach \\x in {1,...,3} {-- (\\x,1) -- (\\x,0)}",
                "foreach \\x in {1,...,3} {-- (\\x,1) -- (\\x,0)}",
            ],
            [
                "\\foreach [var=\\p] in {1,...,3} {(\\p,1)--(\\p,3)}",
                "\\foreach [var=\\p] in {1,...,3} {(\\p,1)--(\\p,3)}",
            ],
            [
                `: fill opacity={ 0s="1", 2s="0", begin on=click }`,
                `:fill opacity = { 0s="1", 2s="0", begin on=click }`,
            ],
        ];

        for (const [inStr, outStr] of EXAMPLES) {
            it(`parses "${inStr}"`, () => {
                const parsed = tikzParse(strToNodes(inStr));
                expect(tikzPrintRaw(parsed)).toEqual(outStr);
            });
        }
    });
    describe("Can parse and print path body with comments", () => {
        const EXAMPLES: [string, string][] = [
            ["(0,0) -- %foo\n (1,1)", "(0,0) -- %foo\n(1,1)"],
            ["(0,0) --%foo\n (1,1)", "(0,0) --%foo\n(1,1)"],
            [
                " [color=red %foo\n] (1,1) -- (2,0) -- (3,1)",
                "[color=red %foo\n] (1,1) -- (2,0) -- (3,1)",
            ],
            ["(a.north) |- (b.west)", "(a.north) |- (b.west)"],
            [
                ".. controls % foo\n (1,1) % bar\n ..",
                "% foo\n% bar\n.. controls (1,1) ..",
            ],
            [
                ".. controls% foo\n (1,1) %baz\n and %bar\n  (2,3) % bloop\n ..",
                "% foo\n%baz\n%bar\n% bloop\n.. controls (1,1) and (2,3) ..",
            ],
            [
                "svg %comm\n[scale=2]%ent\n {h 10 v 10 h -10}",
                "%comm\n%ent\nsvg[scale=2] {h 10 v 10 h -10}",
            ],
            [
                "foreach%1\n \\x %2\nin%3\n {1,...,3}%4\n {-- (\\x,1) -- (\\x,0)}%5",
                "%1\n%3\n%4\nforeach \\x %2\n in {1,...,3} {-- (\\x,1) -- (\\x,0)}%5\n",
            ],
        ];

        for (const [inStr, outStr] of EXAMPLES) {
            it(`parses "${inStr}"`, () => {
                const parsed = tikzParse(strToNodes(inStr));
                expect(tikzPrintRaw(parsed)).toEqual(outStr);
            });
        }
    });
    describe("Can parse and print \\tikz{} with group or semicolon delimited argument", () => {
        const EXAMPLES: [string, string][] = [
            ["\\tikz {foo} bar", "\\tikz{foo} bar"],
            ["\\tikz foo baz; bar", "\\tikz{foo baz;} bar"],
            ["\\tikz [xxx] {foo} bar", "\\tikz[xxx]{foo} bar"],
            ["\\tikz [xxx] foo baz; bar", "\\tikz[xxx]{foo baz;} bar"],
            ["\\tikz :fill = {aaa} :rotate = {bbb} [xxx] foo baz; bar", "\\tikz :fill = {aaa} :rotate = {bbb} [xxx]{foo baz;} bar"],
        ];

        for (const [inStr, outStr] of EXAMPLES) {
            it(`parses "${inStr}"`, () => {
                const parsed = strToNodes(inStr);
                expect(printRaw(parsed)).toEqual(outStr);
            });
        }
    });
});
