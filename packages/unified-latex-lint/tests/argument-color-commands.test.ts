import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { VFile } from "vfile";
import util from "util";
import { unifiedLatexLintArgumentColorCommands } from "../rules/unified-latex-lint-argument-color-commands";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:argument-color-commands", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("detects color commands", () => {
        value = "a {\\color{blue} b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "a \\textcolor{blue}{b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });

    it("replaces shaping commands at start of group", () => {
        value = "a {\\color{blue} b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\textcolor{blue}{b}");

        value = "a {\\color{blue} b c d}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\textcolor{blue}{b c d}");

        value = "a {%important comment\n\\color{blue} b c d}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "a %important comment\n\\textcolor{blue}{b c d}"
        );
    });

    it("preserves color's optional args", () => {
        value = "a {\\color[rgb]{blue} b}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\textcolor[rgb]{blue}{b}");
    });

    it("replaces color command in the middle of string", () => {
        value = "a \\color{blue} b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\textcolor{blue}{b}");

        value = "a \\color{blue} b \\color{red} c";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "a \\textcolor{blue}{b \\textcolor{red}{c}}"
        );

        value = "\\emph{a \\color{blue} b \\color{red} c}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintArgumentColorCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual(
            "\\emph{a \\textcolor{blue}{b \\textcolor{red}{c}}}"
        );
    });
});
