import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import rehypeStringify from "rehype-stringify";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexToHast } from "../libs/unified-latex-plugin-to-hast";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, { parser: "html" });
    } catch {
        console.warn("Could not format HTML string", str);
        return str;
    }
}
/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-hast:unified-latex-to-hast", () => {
    let html: string;

    const process = (value: string) =>
        processLatexViaUnified()
            .use(unifiedLatexToHast)
            .use(rehypeStringify)
            .processSync({ value }).value as string;

    it("wrap pars and streaming commands", () => {
        html = process("a\n\nb");
        expect(html).toEqual("<p>a</p><p>b</p>");

        html = process("\\bfseries a\n\nb");
        expect(html).toEqual(
            '<p><b class="textbf">a</b></p><p><b class="textbf">b</b></p>'
        );

        html = process("\\bf a\n\nb");
        expect(html).toEqual(
            '<p><b class="textbf">a</b></p><p><b class="textbf">b</b></p>'
        );

        html = process(
            "\\begin{enumerate}\\item foo\\item bar\\end{enumerate}"
        );
        expect(html).toEqual(
            '<ol class="enumerate"><li><p>foo</p></li><li><p>bar</p></li></ol>'
        );
    });

    it("Can replace text-style macros", () => {
        html = process(String.raw`a \textbf{different} word`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a <b class="textbf">different</b> word`)
        );

        html = process(String.raw`a \textsf{different} word`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a <span class="textsf">different</span> word`)
        );

        html = process(String.raw`a \textrm{different} word`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a <span class="textrm">different</span> word`)
        );

        html = process(String.raw`a \emph{different} word`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a <em class="emph">different</em> word`)
        );
    });
    it("Can replace headings", () => {
        html = process(String.raw`\chapter{My Chapter}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<h2>My Chapter</h2>`)
        );

        html = process(String.raw`\section{My Section}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<h3>My Section</h3>`)
        );

        html = process(String.raw`\section*{My Section}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<h3 class="starred">My Section</h3>`)
        );
    });

    it("Comments are removed from HTML", () => {
        html = process(`a % foo\nb`);
        expect(normalizeHtml(html)).toEqual(normalizeHtml(`a b`));

        html = process(`a% foo\nb`);
        expect(normalizeHtml(html)).toEqual(normalizeHtml(`ab`));

        html = process(`a% foo\n\nb`);
        expect(normalizeHtml(html)).toEqual(normalizeHtml(`<p>a</p><p>b</p>`));

        html = process(`a % foo\n\nb`);
        expect(normalizeHtml(html)).toEqual(normalizeHtml(`<p>a</p><p>b</p>`));
    });

    it("Wraps URLs", () => {
        html = process(`a\\url{foo.com}b`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a<a class="url" href="foo.com">foo.com</a>b`)
        );

        html = process(`a\\href{foo.com}{FOO}b`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a<a class="href" href="foo.com">FOO</a>b`)
        );
    });

    it("Converts enumerate environments", () => {
        html = process(`\\begin{enumerate}\\item a\\item b\\end{enumerate}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<ol class="enumerate"><li><p>a</p></li><li><p>b</p></li></ol>`
            )
        );

        // Any content before an \item is ignored
        html = process(
            `\\begin{enumerate}before content\\item a\\item b\\end{enumerate}`
        );
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<ol class="enumerate"><li><p>a</p></li><li><p>b</p></li></ol>`
            )
        );

        // Custom labels are handled
        html = process(
            `\\begin{enumerate}before content\\item[x)] a\\item[] b\\end{enumerate}`
        );
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<ol class="enumerate">
                <li style="list-style-type: &#x27;x) &#x27;"><p>a</p></li>
                <li style="list-style-type: none;"><p>b</p></li>
            </ol>`)
        );
    });
    it("Converts itemize environments", () => {
        html = process(`\\begin{itemize}\\item a\\item b\\end{itemize}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<ul class="itemize"><li><p>a</p></li><li><p>b</p></li></ul>`
            )
        );

        // Any content before an \item is ignored
        html = process(
            `\\begin{itemize}before content\\item a\\item b\\end{itemize}`
        );
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<ul class="itemize"><li><p>a</p></li><li><p>b</p></li></ul>`
            )
        );

        // Custom labels are handled
        html = process(
            `\\begin{itemize}before content\\item[x)] a\\item[] b\\end{itemize}`
        );
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<ul class="itemize">
                <li style="list-style-type: &#x27;x) &#x27;"><p>a</p></li>
                <li style="list-style-type: none;"><p>b</p></li>
            </ul>`)
        );
    });

    it("Converts tabular environment", () => {
        html = process(`\\begin{tabular}{l l}a & b\\\\c & d\\end{tabular}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<table class="tabular">
                <tbody>
                    <tr>
                        <td>a</td>
                        <td>b</td>
                    </tr>
                    <tr>
                        <td>c</td>
                        <td>d</td>
                    </tr>
                </tbody>
            </table>`
            )
        );
    });

    it("Can wrap in <p>...</p> tags", () => {
        html = process(`a\\par b`);
        expect(normalizeHtml(html)).toEqual(normalizeHtml(`<p>a</p><p>b</p>`));

        html = process(`a\n\n b`);
        expect(normalizeHtml(html)).toEqual(normalizeHtml(`<p>a</p><p>b</p>`));

        html = process(`a\n b\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a b</p><p>c</p>`)
        );
        html = process(`a\\section{foo} b\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a</p><h3>foo</h3><p>b</p><p>c</p>`)
        );
        html = process(`a\\section{foo} b\\section{bar}\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a</p><h3>foo</h3><p>b</p><h3>bar</h3><p>c</p>`)
        );
        html = process(`a\n \\emph{b}\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a <em class="emph">b</em></p><p>c</p>`)
        );
        html = process(`a\n b\\begin{foo}x\\end{foo}c\n\nd`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<p>a b</p><div class="environment foo">x</div><p>c</p><p>d</p>`
            )
        );
    });

    it("Macros aren't replaced with html code in math mode", () => {
        let ast;

        // Custom labels are handled
        ast = process(`\\[a\\\\b\\]`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<div class="display-math">a\\\\b</div>`)
        );
    });

    it("Ligatures that are nested inside of math mode are not replaced", () => {
        let ast;

        // Custom labels are handled
        ast = process(`$a\\text{\\#}b$`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<span class="inline-math">a\\text{\\#}b</span>`)
        );
    });

    it("Pars are broken at display math", () => {
        let ast;

        ast = process(`x\n\ny\\[a\\\\b\\]z`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(
                `<p>x</p><p>y</p><div class="display-math">a\\\\b</div><p>z</p>`
            )
        );
    });
    it("replaces command inside argument", () => {
        let ast;

        ast = process(`\\emph{\\bfseries b}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml('<em class="emph"><b class="textbf">b</b></em>')
        );
    });
    it("replaces command inside enumerate", () => {
        let ast;

        ast = process(`\\begin{enumerate}\\item\\bfseries b\\end{enumerate}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<ol class=\"enumerate\">
        <li>
          <p><b class=\"textbf\">b</b></p>
        </li>
      </ol>`)
        );
    });
});
