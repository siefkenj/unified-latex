import { describe, it, expect } from "vitest";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { VFile } from "vfile";
import util from "util";
import { unifiedLatexWrapPars } from "../libs/unified-latex-wrap-pars";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-hast:unified-latex-wrap-pars", () => {
    let file: VFile;

    it("Can wrap pars", () => {
        const process = (value: string) =>
            processLatexViaUnified()
                .use(unifiedLatexWrapPars)
                .processSync({ value });

        file = process("a\\par b");
        expect(file.value).toEqual("\\html-tag:p{a}\\html-tag:p{b}");

        file = process("a\n\n b");
        expect(file.value).toEqual("\\html-tag:p{a}\\html-tag:p{b}");

        file = process("a\\section{foo} b");
        expect(file.value).toEqual(
            "\\html-tag:p{a}\n\\section{foo}\n\\html-tag:p{b}"
        );

        file = process("a\\section{foo} b\\section{bar}");
        expect(file.value).toEqual(
            "\\html-tag:p{a}\n\\section{foo}\n\\html-tag:p{b}\n\\section{bar}"
        );

        file = process("a\n \\emph{b}");
        expect(file.value).toEqual("\\html-tag:p{a \\emph{b}}");

        file = process("a\n b\\begin{foo}x\\end{foo}c");
        expect(file.value).toEqual(
            "\\html-tag:p{a b}\n\\begin{foo}\n\tx\n\\end{foo}\\html-tag:p{c}"
        );

        file = process("a\\begin{document}b\\end{document}");
        expect(file.value).toEqual(
            "a\n\\begin{document}\n\t\\html-tag:p{b}\n\\end{document}"
        );
    });
});
