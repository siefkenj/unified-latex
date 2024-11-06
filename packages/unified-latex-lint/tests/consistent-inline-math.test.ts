import { VFile } from "vfile";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexLintConsistentInlineMath } from "../rules/unified-latex-lint-consistent-inline-math";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:consistent-inline-math", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can detect mixed TeX and LaTeX style inline math", () => {
        value = "a $b$ \\(c\\)";
        file = processLatexViaUnified()
            .use(unifiedLatexLintConsistentInlineMath)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        // If only one style is used, no lints
        value = "a $b$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintConsistentInlineMath)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);

        value = "a $b$ \\(c\\) \\(d\\) \\(e\\) $f$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintConsistentInlineMath)
            .processSync({ value });
        expect(file.messages).toHaveLength(2);
    });
    it("can detect specific inline math style", () => {
        value = "a $b$ \\(c\\)";
        file = processLatexViaUnified()
            .use(unifiedLatexLintConsistentInlineMath, {
                preferredStyle: "tex",
            })
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "a $b$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintConsistentInlineMath, {
                preferredStyle: "tex",
            })
            .processSync({ value });
        expect(file.messages).toHaveLength(0);

        value = "a $b$ \\(c\\) \\(d\\) \\(e\\) $f$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintConsistentInlineMath, {
                preferredStyle: "tex",
            })
            .processSync({ value });
        expect(file.messages).toHaveLength(3);
    });
});
