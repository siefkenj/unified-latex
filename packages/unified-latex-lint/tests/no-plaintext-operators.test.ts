import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexLintNoPlaintextOperators } from "../rules/unified-latex-lint-no-plaintext-operators";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:no-plaintext-operators", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it('can detect naked operators (like "sin")', () => {
        value = "$a sin b$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        // They are only detected in math mode
        value = "a sin b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);

        // Operators wrapped in `\operatorname{...}` or `\text{...}` are not detected
        // (as they are regular strings)
        value = "$a \\operatorname{sin} b \\text{sin}$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });
    it("can replace naked operators", () => {
        value = "$a sin b$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("$a \\sin b$");

        value = "$a sin b cos$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("$a \\sin b \\cos$");
    });
    it("longer operator names are substituted when needed", () => {
        value = "$a arg min argmin b$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("$a \\arg \\min \\argmin b$");
    });
    it("operators are not substituted in the middle of strings", () => {
        value = "$sidsin$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("$sidsin$");

        value = "$sinx$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("$sinx$");

        value = "$sin4$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("$\\sin4$");
    });
});
