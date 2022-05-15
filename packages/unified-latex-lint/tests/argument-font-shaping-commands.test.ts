import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexLintArgumentFontShapingCommands } from "../rules/unified-latex-lint-argument-font-shaping-commands";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:argument-font-shaping-commands", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("detects shaping commands", () => {
        value = "a {\\bfseries b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "a \\textbf{b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });

    it("replaces shaping commands at start of group", () => {
        value = "a {\\bfseries b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\textbf{b}");

        value = "a {\\bfseries b c d}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\textbf{b c d}");

        value = "a {%important comment\n\\bfseries b c d}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a %important comment\n\\textbf{b c d}");
    });

    it("replaces shaping command in the middle of string", () => {
        value = "a \\ttfamily b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\texttt{b}");

        value = "a \\ttfamily b \\sffamily c";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\texttt{b \\textsf{c}}");

        value = "\\emph{a \\ttfamily b \\sffamily c}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("\\emph{a \\texttt{b \\textsf{c}}}");

        value = "{a \\ttfamily b \\sffamily c}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("{a \\texttt{b \\textsf{c}}}");
    });

    it("preserves whitespace when replacing shaping command", () => {
        value = "{a \\ttfamily b }";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("{a \\texttt{b} }");

        value = "a\\ttfamily b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a\\texttt{b}");
    });

    it("removes shaping commands at the end of a group", () => {
        value = "a {\\bfseries}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a ");

        value = "a { \\bfseries }";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a ");

        value = "a {b \\bfseries }";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a {b }");
    });

    it("does not replace shaping commands if they affect a parbreak", () => {
        value = "a \\bfseries\n\nb";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\bfseries\n\nb");

        value = "a {\\bfseries x\n\nb}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a {\\bfseries x\n\nb}");
    });
});
