import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { processLatexViaUnified } from "../../unified-latex-util-parse";
import { unifiedLatexLintNoTexDisplayMath } from "../rules/unified-latex-lint-no-tex-display-math";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:no-tex-display-math", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can detect tex display math ($$...$$)", () => {
        value = "a $$b$$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoTexDisplayMath)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);
        value = "a \\[b\\]";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoTexDisplayMath)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });
});
