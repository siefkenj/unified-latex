import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { unifiedLatexToHtmlLike } from "../libs/unified-latex-plugin-to-html-like";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-hast:unified-latex-to-html-like", () => {
    let file: VFile;
    const process = (value: string) =>
        processLatexViaUnified()
            .use(unifiedLatexToHtmlLike)
            .processSync({ value });

    it("wrap pars and streaming commands", () => {
        file = process("a\n\nb");
        expect(file.value).toEqual("\\html-tag:p{a}\\html-tag:p{b}");

        file = process("\\bfseries a\n\nb");
        expect(file.value).toEqual(
            '\\html-tag:p{\\html-tag:b{\\html-attr:className{"textbf"}a}}\\html-tag:p{\\html-tag:b{\\html-attr:className{"textbf"}b}}'
        );

        file = process("\\bf a\n\nb");
        expect(file.value).toEqual(
            '\\html-tag:p{\\html-tag:b{\\html-attr:className{"textbf"}a}}\\html-tag:p{\\html-tag:b{\\html-attr:className{"textbf"}b}}'
        );

        file = process(
            "\\begin{enumerate}\\item foo\\item bar\\end{enumerate}"
        );
        expect(file.value).toEqual(
            '\\html-tag:ol{\\html-attr:className{"enumerate"}\\html-tag:li{\\html-tag:p{foo}}\\html-tag:li{\\html-tag:p{bar}}}'
        );
    });
});
