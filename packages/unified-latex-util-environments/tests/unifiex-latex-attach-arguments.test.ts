import { unified } from "unified";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../unified-latex-util-render-info";
import * as Ast from "../../unified-latex-types";
import {
    unifiedLatexAstComplier,
    unifiedLatexFromStringMinimal,
} from "../../unified-latex-util-parse";
import { unifiedLatexProcessEnvironments } from "../libs/unified-latex-process-environment";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-environments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("unified-latex-process-environment", () => {
        const file = unified()
            .use(unifiedLatexFromStringMinimal)
            .use(unifiedLatexProcessEnvironments, {
                environments: {
                    xxx: {
                        signature: "m",
                    },
                },
            })
            .use(unifiedLatexAstComplier)
            .processSync({ value: "\\begin{xxx}{foo}a b\\end{xxx}" });

        let root = trimRenderInfo(file.result as Ast.Root) as Ast.Root;
        expect(root.content).toEqual([
            {
                type: "environment",
                env: "xxx",
                args: [
                    {
                        closeMark: "}",
                        content: [{ content: "foo", type: "string" }],
                        openMark: "{",
                        type: "argument",
                    },
                ],
                content: [
                    { content: "a", type: "string" },
                    { type: "whitespace" },
                    { content: "b", type: "string" },
                ],
            },
        ]);
    });
});
