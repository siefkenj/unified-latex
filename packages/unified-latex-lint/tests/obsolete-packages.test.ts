import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexLintObsoletePackages } from "../rules/unified-latex-lint-obsolete-packages";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-lint:obsolete-packages", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    it("can detect obsolete packages", () => {
        value = "\\usepackage{a4}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintObsoletePackages)
            .processSync({ value });
        expect(file.messages).toHaveLength(1);
    });
    it("can detect obsolete packages in a comma separated list", () => {
        value = "\\usepackage{geometry, a4, euler}";
        file = processLatexViaUnified()
            .use(unifiedLatexLintObsoletePackages)
            .processSync({ value });
        expect(file.messages).toHaveLength(2);
    });
});
