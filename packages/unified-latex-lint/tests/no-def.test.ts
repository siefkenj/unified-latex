import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { processLatexViaUnified } from "../../unified-latex-util-parse";
import { unifiedLatexLintNoDef } from "../rules/unified-latex-lint-no-def";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:no-def", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can find usages of \\def", () => {
        value = "\\def\\macro{val}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoDef)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);

        value = "\\newcommand{\\macro}{val}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintNoDef)
            .processSync({ value });
        expect(file.messages).toHaveLength(0);
    });
});
