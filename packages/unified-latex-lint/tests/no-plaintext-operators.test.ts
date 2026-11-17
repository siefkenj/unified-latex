import { VFile } from "vfile";
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

        // Nor are operators set in a font with `\mathrm{...}` and friends
        value = "$\\mathrm{sin}(x) \\mathop{max} \\mathit{min}$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });
    it("still detects operators that are not deliberately set as a word", () => {
        for (const value of [
            // `\mathnormal` and `\boldsymbol` set letters like plain math
            "$\\mathnormal{sin}(x)$",
            "$\\boldsymbol{sin}$",
            // Only an argument that is just a word is exempt, not everything inside a font macro
            "$\\mathbf{x + \\left(sin y\\right)}$",
            "$\\mathrm{a + sin b}$",
            // Only a font switch followed by just a word is exempt
            "${\\rm a + sin}$",
            "${\\rm sin} {\\rm a + sin}$",
            // Groups that can't be arguments of unknown macros are in math mode
            "${sin x}$",
            "$x^{sin y}$",
            "$x_{sin y}$",
            "$\\frac{sin x}{2}$",
            "$\\frac{a}{b} {sin x}$",
            "\\[ {sin x} \\]",
            "\\begin{equation}{sin x}\\end{equation}",
            // The body of `\textcolor` is in the mode of its surroundings
            "$\\textcolor{red}{sin x}$",
        ]) {
            file = processLatexViaUnified()
                .use(unifiedLatexLintNoPlaintextOperators)
                .processSync({ value });
            expect(file.messages, value).toHaveLength(1);
        }
    });
    it("does not detect operators that may be set as a word", () => {
        for (const value of [
            // A font switch sets the rest of its group as a word
            "$\\lim {\\rm sin} x$",
            "${\\bf sin}$",
            // Spacing may be part of a word
            "$\\mathrm{arg\\,max}$",
            "$\\mathit{arg max}$",
            "${\\it arg\\,max}$",
            // Text inside math is not checked
            "$\\textcolor{red}{\\text{sin}}$",
            // The arguments of unknown macros may be in text mode
            "$\\myop{sin}$",
            "$\\myop{x}{y sin}$",
            "$\\myop {sin}$",
            "$\\myop %c\n{sin}$",
            "$\\myop{sin}{x} {cos y}$",
        ]) {
            file = processLatexViaUnified()
                .use(unifiedLatexLintNoPlaintextOperators)
                .processSync({ value });
            expect(file.messages, value).toHaveLength(0);
        }
    });
    it("does not replace operators set in a font", () => {
        value = "$\\mathrm{sin}(x) \\mathrm{arg\\,max} {\\rm sin}$";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "$\\mathrm{sin}(x) \\mathrm{arg\\,max}{\\rm sin}$"
        );
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
    it("can replace operators inside groups in math", () => {
        for (const [value, expected] of [
            ["${sin x}$", "${\\sin x}$"],
            ["$x^{sin y}$", "$x^{\\sin y}$"],
            ["$\\textcolor{red}{sin x}$", "$\\textcolor{red}{\\sin x}$"],
            // Only the operator that isn't set as a word is replaced
            ["${\\rm sin} {\\rm a + sin}$", "${\\rm sin}{\\rm a + \\sin}$"],
        ]) {
            file = processLatexViaUnified()
                .use(unifiedLatexLintNoPlaintextOperators, { fix: true })
                .processSync({ value });
            expect(file.value, value).toEqual(expected);
        }
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
