import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexLintPreferSetlength } from "../rules/unified-latex-lint-prefer-setlength";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:prefer-setlength", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can find length assignments", () => {
        value = "\\parskip=3mm";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "\\parskip = 3mm";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "\\usepackage{foobar}\\parskip = 3mm\\xxx";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "\\usepackage{foobar}\\parskip %\n  = 3mm\\xxx";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);
    });
    it("can fix length assignments", () => {
        value = "\\parskip=3mm plus 4fil minus -2.3cmX";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "\\setlength{\\parskip}{3mm plus 4fil minus -2.3cm}X"
        );

        value = "\\parskip = 3mm";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("\\setlength{\\parskip}{3mm}");

        value = "\\usepackage{foobar}\\parskip = 3mm\\xxx";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "\\usepackage{foobar}\n\\setlength{\\parskip}{3mm}\\xxx"
        );

        value = "\\usepackage{foobar}\\parskip %\n  = 3mm\\xxx";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "\\usepackage{foobar}\n\\setlength{\\parskip}{3mm}\\xxx"
        );
    });
    it("can fix multiple length assignments", () => {
        value = "\\parskip=3mm plus 4cm\\parskip=10cmX";
        file = processLatexViaUnified()
            .use(unifiedLatexLintPreferSetlength, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "\\setlength{\\parskip}{3mm plus 4cm}\\setlength{\\parskip}{10cm}X"
        );
    });
});
