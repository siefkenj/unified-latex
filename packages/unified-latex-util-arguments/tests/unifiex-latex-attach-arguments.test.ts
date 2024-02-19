import { describe, it, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromStringMinimal,
} from "../../unified-latex-util-parse";
import { unifiedLatexAttachMacroArguments } from "../libs/unified-latex-attach-macro-arguments";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("unified-latex-attach-arguments", () => {
        const file = unified()
            .use(unifiedLatexFromStringMinimal)
            .use(unifiedLatexAttachMacroArguments, {
                macros: {
                    xxx: {
                        signature: "m",
                    },
                },
            })
            .use(unifiedLatexAstComplier)
            .processSync({ value: "{a\\xxx b}c" });

        let root = trimRenderInfo(file.result as Ast.Root) as Ast.Root;
        expect(root.content).toEqual([
            {
                type: "group",
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "macro",
                        content: "xxx",
                        args: [
                            {
                                type: "argument",
                                content: [{ type: "string", content: "b" }],
                                openMark: "{",
                                closeMark: "}",
                            },
                        ],
                    },
                ],
            },
            { type: "string", content: "c" },
        ]);
    });
});
