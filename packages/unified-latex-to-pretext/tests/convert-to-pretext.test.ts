import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { unifiedLatexToPretext } from "../libs/unified-latex-plugin-to-pretext";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { convertToPretext, xmlCompilePlugin } from "../libs/convert-to-pretext";
import { Node } from "@unified-latex/unified-latex-types";
import {
    getParser,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { unified } from "unified";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, { parser: "xml", plugins: ["@prettier/plugin-xml"] });
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

describe("unified-latex-to-pretext:convert-to-pretext", () => {
    let html: string;

    it("custom replacers work", () => {
        const process = (value: string) =>
            getParser({
                macros: { xxx: { signature: "m m" } },
            }).parse({ value });

        const convert = (value: Node) =>
            convertToPretext(value, {
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
                producePretextFragment: true,
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
                .use(unifiedLatexToPretext, {
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
                    producePretextFragment: true,
                })
                .use(xmlCompilePlugin)
                .processSync(value).value as string;

        let ast: string;

        ast = convert(`\\includegraphics{myfile.pdf}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<img src="myfile.png"></img>`)
        );
    });
});
