import { describe, it, expect } from "vitest";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { unifiedLatexToXmlLike } from "../libs/unified-latex-plugin-to-xml-like";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:unified-latex-to-xml-like", () => {
    let file: VFile;
    const process = (value: string) =>
        processLatexViaUnified()
            .use(unifiedLatexToXmlLike, { producePretextFragment: true })
            .processSync({ value });

    it("wrap pars and streaming commands", () => {
        file = process("a\n\nb");
        expect(file.value).toEqual("\\html-tag:p{a}\\html-tag:p{b}");

        file = process("\\bfseries a\n\nb");
        expect(file.value).toEqual(
            "\\html-tag:p{\\html-tag:alert{a}}\\html-tag:p{\\html-tag:alert{b}}"
        );

        file = process("\\bf a\n\nb");
        expect(file.value).toEqual(
            "\\html-tag:p{\\html-tag:alert{a}}\\html-tag:p{\\html-tag:alert{b}}"
        );

        file = process(
            "\\begin{enumerate}\\item foo\\item bar\\end{enumerate}"
        );
        expect(file.value).toEqual(
            "\\html-tag:ol{\\html-tag:li{\\html-tag:p{foo}}\\html-tag:li{\\html-tag:p{bar}}}"
        );
    });

    it("can accept custom replacers", () => {
        const process = (value: string) =>
            processLatexViaUnified({ macros: { xxx: { signature: "m m" } } })
                .use(unifiedLatexToXmlLike, {
                    macroReplacements: {
                        xxx: (node) =>
                            htmlLike({
                                tag: "xxx",
                                attributes: Object.fromEntries(
                                    (node.args || []).map((x, i) => [
                                        i,
                                        printRaw(x.content),
                                    ])
                                ),
                            }),
                    },
                    environmentReplacements: {
                        yyy: (node) =>
                            htmlLike({ tag: "yyy", content: node.content }),
                    },
                    producePretextFragment: true,
                })
                .processSync({ value });

        file = process("\\xxx{a}{b}");
        expect(file.value).toEqual(
            `\\html-tag:xxx{\\html-attr:0{"a"}\\html-attr:1{"b"}}`
        );

        file = process("\\begin{yyy}a\\end{yyy}");
        expect(file.value).toEqual(`\\html-tag:yyy{a}`);
    });
});
