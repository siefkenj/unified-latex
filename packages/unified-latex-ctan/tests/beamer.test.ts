import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { cleanEnumerateBody } from "../utils/enumerate";
import { strToNodes } from "../../test-common";
import { arg, args, m } from "@unified-latex/unified-latex-builder";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-ctan:beamer", () => {
    it("Parses overlay specifications like '<2-6>'", () => {
        const EXAMPLES: [string, Ast.Node[]][] = [
            [
                "\\uncover<4>{xxx}",
                [m("uncover", args(["4", "xxx"], { braces: "<>{}" }))],
            ],
            [
                "\\uncover{xxx}",
                [m("uncover", args([null, "xxx"], { braces: "<>{}" }))],
            ],
        ];

        for (const [inStr, expectedParse] of EXAMPLES) {
            expect(strToNodes(inStr)).toEqual(expectedParse);
        }
    });
    it("Parses strange commands", () => {
        const EXAMPLES: [string, Ast.Node[]][] = [
            [
                "\\onslide+<foo>",
                [m("onslide", args([arg("+", {openMark:"", closeMark:""}), null, "foo", null], { braces: "[][]<>{}" }))],
            ],
            [
                "\\onslide+<foo>{bar}",
                [m("onslide", args([arg("+", {openMark:"", closeMark:""}), null, "foo", "bar"], { braces: "[][]<>{}" }))],
            ],
            [
                "\\onslide{bar}",
                [m("onslide", args([null, null, null, "bar"], { braces: "[][]<>{}" }))],
            ],
        ];

        for (const [inStr, expectedParse] of EXAMPLES) {
            expect(strToNodes(inStr)).toEqual(expectedParse);
        }
    });
});
