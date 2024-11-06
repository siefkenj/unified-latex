import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { VFile } from "vfile";
import util from "util";
import "../../test-common";
import { processLatexToAstViaUnified } from "../libs/unified-latex";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("can process via unified", () => {
        // Display math
        value = "foo bar";
        file = processLatexToAstViaUnified().processSync({ value });

        expect(trimRenderInfo(file.result as any)).toEqual({
            type: "root",
            content: [
                { content: "foo", type: "string" },
                { type: "whitespace" },
                { content: "bar", type: "string" },
            ],
        });
    });
});
