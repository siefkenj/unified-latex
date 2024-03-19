import { describe, it, expect } from "vitest";
import util from "util";
import { parse } from "@unified-latex/unified-latex-util-parse";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    attachNeededRenderInfo,
    katexSpecificMacroReplacements,
} from "../libs/pre-html-subs/katex-subs";
import { match } from "@unified-latex/unified-latex-util-match";
import { Macro, Node } from "@unified-latex/unified-latex-types/index";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-hast:katex-subs", () => {
    it("can expand systeme", () => {
        const parsed = trimRenderInfo(
            parse("$\\sysdelim{[}{.}x=\\systeme{a&b\\\\x&y}$")
        );
        const isKatexMacro = match.createMacroMatcher(
            katexSpecificMacroReplacements
        );
        attachNeededRenderInfo(parsed);
        replaceNode(parsed, (node: Macro) => {
            if (isKatexMacro(node)) {
                return katexSpecificMacroReplacements[node.content](node);
            }
        });

        //trimRenderInfo(parsed);

        expect(parsed).toEqual({
            content: [
                {
                    content: [
                        {
                            content: "x",
                            type: "string",
                        },
                        {
                            content: "=",
                            type: "string",
                        },
                        {
                            content: "left",
                            type: "macro",
                        },
                        {
                            content: "[",
                            type: "string",
                        },
                        {
                            args: [
                                {
                                    closeMark: "}",
                                    content: [
                                        {
                                            content: "r",
                                            type: "string",
                                        },
                                    ],
                                    openMark: "{",
                                    type: "argument",
                                },
                            ],
                            content: [
                                {
                                    content: "a",
                                    type: "string",
                                },
                                {
                                    content: "&",
                                    type: "string",
                                },
                                {
                                    content: "b",
                                    type: "string",
                                },
                                {
                                    args: [
                                        {
                                            closeMark: "",
                                            content: [],
                                            openMark: "",
                                            type: "argument",
                                        },
                                        {
                                            closeMark: "",
                                            content: [],
                                            openMark: "",
                                            type: "argument",
                                        },
                                    ],
                                    content: "\\",
                                    type: "macro",
                                },
                                {
                                    content: "x",
                                    type: "string",
                                },
                                {
                                    content: "&",
                                    type: "string",
                                },
                                {
                                    content: "y",
                                    type: "string",
                                },
                            ],
                            env: "array",
                            type: "environment",
                        },
                        {
                            content: "right",
                            type: "macro",
                        },
                        {
                            content: ".",
                            type: "string",
                        },
                    ],
                    type: "inlinemath",
                },
            ],
            type: "root",
        });
    });
});
