import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-parse", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        const root = trimRenderInfo(file.result as any) as Ast.Root;
        return root.content;
    }

    it("trims whitespace/parbreaks in math environments", () => {
        // Display math
        let targetAst = strToNodes("\\[\\]");

        let ast = strToNodes("\\[ \\]");
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\[\n\\]");
        expect(ast).toEqual(targetAst);

        // Inline math
        ast = strToNodes("$ $");
        expect(ast).toEqual([{ type: "inlinemath", content: [] }]);

        ast = strToNodes("$\n$");
        expect(ast).toEqual([{ type: "inlinemath", content: [] }]);

        // Environments
        targetAst = strToNodes("\\begin{equation}\\end{equation}");

        ast = strToNodes("\\begin{equation} \\end{equation}");
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{equation}\n \\end{equation}");
        expect(ast).toEqual(targetAst);
        // Display math
    });

    it("merges whitespace and parbreaks", () => {
        // wrap the parbreak in a group so that it doesn't get trimmed by the parser
        let targetAst = strToNodes("{\n\n}");

        let ast = strToNodes("{\n}");
        trim(ast);
        expect(ast).not.toEqual(targetAst);

        ast = strToNodes("{\n\n\n}");
        trim(ast);
        expect(ast).toEqual(targetAst);

        ast = strToNodes("{\n\n \n}");
        trim(ast);
        expect(ast).toEqual(targetAst);

        ast = strToNodes("{\n\n \n\n}");
        trim(ast);
        expect(ast).toEqual(targetAst);
    });
});
