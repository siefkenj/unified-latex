import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import rehypeStringify from "rehype-stringify";
import util from "util";
import { unifiedLatexToHast } from "../libs/unified-latex-plugin-to-hast";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { convertToHtml } from "../libs/convert-to-html";
import { Node } from "@unified-latex/unified-latex-types";
import {
    getParser,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { unified } from "unified";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, { parser: "html" });
    } catch {
        console.warn("Could not format HTML string", str);
        return str;
    }
}
/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-hast:convert-to-html", () => {
    let html: string;

    it("custom replacers work", () => {
        const process = (value: string) =>
            getParser({
                macros: { xxx: { signature: "m m" } },
            }).parse({ value });

        const convert = (value: Node) =>
            convertToHtml(value, {
                macroReplacements: {
                    xxx: (node) =>
                        htmlLike({
                            tag: "xxx",
                            attributes: Object.fromEntries(
                                (node.args || []).map((x, i) => [
                                    `arg${i}`,
                                    printRaw(x.content),
                                ])
                            ),
                        }),
                    textbf: (node) =>
                        htmlLike({
                            tag: "my-bold",
                            content: node.args?.[0]?.content || [],
                        }),
                },
                environmentReplacements: {
                    yyy: (node) =>
                        htmlLike({ tag: "yyy", content: node.content }),
                },
            });
        let ast;

        ast = process(`\\xxx{a}{b}`);
        expect(normalizeHtml(convert(ast))).toEqual(
            normalizeHtml(`<xxx arg0="a" arg1="b"></xxx>`)
        );
    });

    it("full unified pipeline with custom processing", () => {
        const convert = (value: string) =>
            unified()
                .use(unifiedLatexFromString)
                .use(unifiedLatexToHast, {
                    macroReplacements: {
                        includegraphics: (node) => {
                            const args = getArgsContent(node);
                            const path = printRaw(
                                args[args.length - 1] || []
                            ).replace(/\.pdf$/, ".png");
                            return htmlLike({
                                tag: "img",
                                attributes: { src: path },
                            });
                        },
                    },
                })
                .use(rehypeStringify)
                .processSync(value).value as string;

        let ast: string;

        ast = convert(`\\includegraphics{myfile.pdf}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<img src="myfile.png">`)
        );
    });

    it("can skip html validation", () => {
        const xxx = () =>
            htmlLike({
                tag: "p",
                content: [
                    htmlLike({
                        tag: "yy",
                        content: [
                            { type: "string", content: "bar" },
                            htmlLike({
                                tag: "p",
                                content: [
                                    {
                                        type: "string",
                                        content: "foo",
                                    },
                                ],
                            }),
                        ],
                    }),
                ],
            });
        let convert = (value: string) =>
            unified()
                .use(unifiedLatexFromString)
                .use(unifiedLatexToHast, {
                    macroReplacements: {
                        // This is a cheap way to produce invalid HTML by directly returning it.
                        // There's probably a more elegant way to test this.
                        xxx,
                    },
                    skipHtmlValidation: false,
                })
                .use(rehypeStringify)
                .processSync(value).value as string;

        let ast: string;

        ast = convert(`\\xxx`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<p><yy>bar</yy></p><p>foo</p><p></p>`)
        );

        convert = (value: string) =>
            unified()
                .use(unifiedLatexFromString)
                .use(unifiedLatexToHast, {
                    macroReplacements: {
                        // This is a cheap way to produce invalid HTML by directly returning it.
                        // There's probably a more elegant way to test this.
                        xxx,
                    },
                    skipHtmlValidation: true,
                })
                .use(rehypeStringify)
                .processSync(value).value as string;

        ast = convert(`\\xxx`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<p><yy>bar<p>foo</p></yy></p>`)
        );
    });
});
