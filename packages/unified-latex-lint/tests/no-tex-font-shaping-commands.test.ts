import { VFile } from "vfile";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexLintNoTexFontShapingCommands } from "../rules/unified-latex-lint-no-tex-font-shaping-commands";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:no-tex-font-shaping-commands", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can detect shaping commands", () => {
        value = "a \\bf b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoTexFontShapingCommands)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);
        value = "a \\bfseries b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoTexFontShapingCommands)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });
    it("can replace shaping commands", () => {
        value = "a \\bf b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoTexFontShapingCommands, { fix: true })
            .processSync({ value });

        expect(file.value).toEqual("a \\bfseries b");

        value = "a \\tt b";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoTexFontShapingCommands, { fix: true })
            .processSync({ value });
        expect(file.value).toEqual("a \\ttfamily b");
    });
});
