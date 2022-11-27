import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { args, m, s, SP } from "@unified-latex/unified-latex-builder";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";
import { unified } from "unified";
import { unifiedLatexFromString } from "../libs/plugin-from-string";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-parse", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("allows overriding of built-in macros", () => {
        // Default parsing
        let parser = unified().use(unifiedLatexFromString, {});
        expect(trimRenderInfo(parser.parse(`\\mathbb X Y`))).toEqual({
            type: "root",
            content: [m("mathbb", args("X")), SP, s("Y")],
        });

        // Default parsing
        parser = unified().use(
            unifiedLatexFromString,
            { macros: { mathbb: { signature: "m m" } } },
        );
        expect(trimRenderInfo(parser.parse(`\\mathbb X Y`))).toEqual({
            type: "root",
            content: [m("mathbb", args(["X", "Y"]))],
        });
    });
});
