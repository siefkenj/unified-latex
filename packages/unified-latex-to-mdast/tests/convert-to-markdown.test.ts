import { describe, it, expect } from "vitest";
import util from "util";
import { unifiedLatexToMdast } from "../libs/unified-latex-plugin-to-mdast";
import { convertToMarkdown } from "../libs/convert-to-markdown";
import { unifiedLatexFromString } from "@unified-latex/unified-latex-util-parse";
import { unified } from "unified";
import remarkStringify from "remark-stringify";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-mdast:convert-to-markdown", () => {
    let markdown: string;

    it("can convert to markdown", () => {
        const convert = (value: string) =>
            String(
                unified()
                    .use(unifiedLatexFromString)
                    .use(unifiedLatexToMdast)
                    .use(remarkStringify)
                    .processSync(value)
            );

        markdown = convert(
            `\\section{My Section}\n\nHi there\n\nAnd here $x^2$`
        );
        expect(markdown).toEqual(
            `### My Section\n\nHi there\n\nAnd here $x^{2}$\n`
        );
    });

    it("convertToMarkdown works", () => {
        let ast = unified()
            .use(unifiedLatexFromString)
            .parse("\\section{My Section}\n\nHi there\n\nAnd here $x^2$ math");
        markdown = convertToMarkdown(ast);
        expect(markdown).toEqual(
            `### My Section\n\nHi there\n\nAnd here $x^{2}$ math\n`
        );
    });
    
    it("display math converts to $$...$$", () => {
        let ast = unified()
            .use(unifiedLatexFromString)
            .parse("my\\[math\\]yay!");
        markdown = convertToMarkdown(ast);
        expect(markdown).toEqual(
            `my\n\n\`\`\`math\nmath\n\`\`\`\n\nyay!\n`
        );
    });
    
    it("math isn't mangled when it is rendered", () => {
        let ast = unified()
            .use(unifiedLatexFromString)
            .parse("$\\sum_x^{y} x+Y$");
        markdown = convertToMarkdown(ast);
        expect(markdown).toEqual(
            `$\\sum_{x}^{y}x+Y$\n`
        );
    });
});
