import { describe, it, expect } from "vitest";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types/index";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";
import { PluginOptions as ParserPluginOptions } from "../libs/plugin-from-string";
import * as AstBuilder from "@unified-latex/unified-latex-builder";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-parse", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string, options?: ParserPluginOptions) {
        value = str;
        file = processLatexToAstViaUnified(options).processSync({ value });
        const root = trimRenderInfo(file.result as any) as Ast.Root;
        return root.content;
    }

    it("trims whitespace/parbreaks in math environments", () => {
        // Display math
        let targetAst = strToNodes("\\[\\]");

        let ast = strToNodes("\\[ \\]");
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\[\n\\]");
        expect(ast).toEqual(targetAst);

        // Inline math
        ast = strToNodes("$ $");
        expect(ast).toEqual([{ type: "inlinemath", content: [] }]);

        ast = strToNodes("$\n$");
        expect(ast).toEqual([{ type: "inlinemath", content: [] }]);

        // Environments
        targetAst = strToNodes("\\begin{equation}\\end{equation}");

        ast = strToNodes("\\begin{equation} \\end{equation}");
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{equation}\n \\end{equation}");
        expect(ast).toEqual(targetAst);
        // Display math
    });

    it("merges whitespace and parbreaks", () => {
        // wrap the parbreak in a group so that it doesn't get trimmed by the parser
        let targetAst = strToNodes("{\n\n}");

        let ast = strToNodes("{\n}");
        trim(ast);
        expect(ast).not.toEqual(targetAst);

        ast = strToNodes("{\n\n\n}");
        trim(ast);
        expect(ast).toEqual(targetAst);

        ast = strToNodes("{\n\n \n}");
        trim(ast);
        expect(ast).toEqual(targetAst);

        ast = strToNodes("{\n\n \n\n}");
        trim(ast);
        expect(ast).toEqual(targetAst);
    });

    it("nested math subscripts", () => {
        let ast = strToNodes("{1_2}", {
            mode: 'math',
        });
        expect(ast).toEqual([{
            type: "group",
            content: [
                AstBuilder.s("1"),
                AstBuilder.m("_", AstBuilder.args([
                    AstBuilder.arg([AstBuilder.s("2")], {
                        openMark: '{',
                        closeMark: '}',
                    }),
                ]), { escapeToken: "" }),
            ],
        }]);

        ast = strToNodes("$O_O\\text{T_T$U_U$}$");
        expect(ast).toEqual([{
            type: "inlinemath",
            content: [
                AstBuilder.s("O"),
                AstBuilder.m("_", AstBuilder.args([
                    AstBuilder.s("O"),
                ]), { escapeToken: "" }),
                AstBuilder.m("text", AstBuilder.args([
                    AstBuilder.arg([
                        AstBuilder.s("T_T"),
                        {
                            type: "inlinemath",
                            content: [
                              AstBuilder.s("U"),
                              AstBuilder.m("_", AstBuilder.args([
                                AstBuilder.arg([
                                  AstBuilder.s("U"),
                                ], {
                                    openMark: "{",
                                    closeMark: "}",
                                }),
                              ]), { escapeToken: "" }),
                            ],
                        },
                    ], {
                        openMark: "{",
                        closeMark: "}",
                    }),
                ])),
            ],
        }]);

    });

    it("nested math single char arguments", () => {
        const ast = strToNodes("{\\frac12}", {
            mode: "math",
        });
        expect(ast).toEqual([{
            type: "group",
            content: [
                AstBuilder.m('frac', AstBuilder.args([
                    AstBuilder.arg([AstBuilder.s("1")], {
                        openMark: '{',
                        closeMark: '}',
                    }),
                    AstBuilder.arg([AstBuilder.s("2")], {
                        openMark: '{',
                        closeMark: '}',
                    }),
                ])),
            ],
        }]);

    });
});
