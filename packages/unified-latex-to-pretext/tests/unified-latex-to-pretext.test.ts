import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexToPretext } from "../libs/unified-latex-plugin-to-pretext";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { match } from "@unified-latex/unified-latex-util-match";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";

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

describe("unified-latex-to-pretext:unified-latex-to-pretext", () => {
    let html: string;

    const process = (value: string) =>
        processLatexViaUnified({ macros: { xxx: { signature: "m m" } } })
            .use(unifiedLatexToPretext, { producePretextFragment: true })
            .use(xmlCompilePlugin)
            .processSync({ value }).value as string;

    it.skip("wrap pars and streaming commands", () => {
        html = process("a\n\nb");
        expect(html).toEqual("<p>a</p><p>b</p>"); // CORRECT

        html = process("\\bfseries a\n\nb");
        expect(html).toEqual(
            // '<p><b class="textbf">a</b></p><p><b class="textbf">b</b></p>'
            "<p><em>a</em></p><p><em>b</em></p>" // maybe alert instead, test difference
        );

        html = process("\\bf a\n\nb");
        expect(html).toEqual(
            // '<p><b class="textbf">a</b></p><p><b class="textbf">b</b></p>'
            "<p><em>a</em></p><p><em>b</em></p>"
        );
    });

    it("Can replace text-style macros", () => {
        html = process(String.raw`a \textbf{different} word`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`a <b class="textbf">different</b> word`)
            normalizeHtml(`a <em>different</em> word`)
        );

        html = process(String.raw`a \textsf{different} word`); // no equivalent = em and warn
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a <span class="textsf">different</span> word`)
        );

        html = process(String.raw`a \textrm{different} word`); // no equivalent = <em>, warn
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`a <span class="textrm">different</span> word`)
        );

        html = process(String.raw`a \emph{different} word`);
        expect(normalizeHtml(html)).toEqual(
            // CORRECT but error if not wrapped around something else like <p>
            normalizeHtml(`a <em>different</em> word`)
        );
    });
    it("Can replace headings", () => {
        html = process(String.raw`\chapter{My Chapter}`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`<h2>My Chapter</h2>`)
            normalizeHtml(`<chapter><title>My Chapter</title></chapter>`)
        );

        html = process(String.raw`\section{My Section}`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`<title>My Section</title>`)
            normalizeHtml(`<section><title>My Section</title></section>`)
        );

        html = process(String.raw`\section*{My Section}`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`<title>My Section</title>`)
            normalizeHtml(`<section><title>My Section</title></section>`)
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

    it.skip("Wraps URLs", () => {
        html = process(`a\\url{foo.com}b`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`a<a class="url" href="foo.com">foo.com</a>b`)
            normalizeHtml(`a<url href="foo.com">foo.com</url>b`)
        );

        html = process(`a\\href{foo.com}{FOO}b`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`a<a class="href" href="foo.com">FOO</a>b`)
            normalizeHtml(`a<url href="foo.com"/>Foo</url>b`)
        );
    });

    it.skip("Converts enumerate environments", () => {
        html = process(`\\begin{enumerate}\\item a\\item b\\end{enumerate}`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                // don't need <p> tag for first two test cases
                // `<ol class="enumerate"><li><p>a</p></li><li><p>b</p></li></ol>`
                `<ol><li><p>a</p></li><li><p>b</p></li></ol>`
            )
        );

        // Any content before an \item is ignored
        html = process(
            `\\begin{enumerate}before content\\item a\\item b\\end{enumerate}`
        );
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                // `<ol class="enumerate"><li><p>a</p></li><li><p>b</p></li></ol>`
                `<ol><li><p>a</p></li><li><p>b</p></li></ol>`
            )
        );

        // Custom labels are handled
        html = process(
            `\\begin{enumerate}before content\\item[x)] a\\item[] b\\end{enumerate}`
        );
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(`<ol class="enumerate">
            //     <li style="list-style-type: &#x27;x) &#x27;"><p>a</p></li>
            //     <li style="list-style-type: none;"><p>b</p></li>
            // </ol>`)
            normalizeHtml(
                `<dl>
                    <li><title>x)</title><p>a</p></li>
                    <li><title></title><p>b</p></li>
                </dl>` // list is centered though
            )
        );
    });
    it.skip("Converts itemize environments", () => {
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
            // normalizeHtml(`<ul class="itemize">
            //     <li style="list-style-type: &#x27;x) &#x27;"><p>a</p></li>
            //     <li style="list-style-type: none;"><p>b</p></li>
            // </ul>`)
            normalizeHtml(
                `<dl>
                    <li><title>x)</title><p>a</p></li>
                    <li><title></title><p>b</p></li>
                </dl>` // list is centered though
            )
        );
    });

    // make this more descriptive since adding another test
    it.skip("Converts tabular environment", () => {
        html = process(`\\begin{tabular}{l l}a & b\\\\c & d\\end{tabular}`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(
            //     `<table class="tabular">
            //     <tbody>
            //         <tr>
            //             <td>a</td>
            //             <td>b</td>
            //         </tr>
            //         <tr>
            //             <td>c</td>
            //             <td>d</td>
            //         </tr>
            //     </tbody>
            // </table>`
            // )

            // centered tho
            normalizeHtml(
                `<tabular>
                    <row>
                        <cell>a</cell>
                        <cell>b</cell>
                    </row>
                    <row>
                        <cell>c</cell>
                        <cell>d</cell>
                    </row>
                </tabular>`
            )
        );
    });

    // add another tabular test here from PR

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
            normalizeHtml(`<p>a</p><title>foo</title><p>b</p><p>c</p>`)
        );
        html = process(`a\\section{foo} b\\section{bar}\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<p>a</p><title>foo</title><p>b</p><title>bar</title><p>c</p>`
            )
        );
        html = process(`a\n \\emph{b}\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a <em>b</em></p><p>c</p>`)
        );
        html = process(`a\n b\\begin{foo}x\\end{foo}c\n\nd`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a b</p><div>x</div><p>c</p><p>d</p>`)
        );
    });

    // output used <m> inline instead
    it.skip("Macros aren't replaced with html code in math mode", () => {
        let ast;

        // Custom labels are handled
        ast = process(`\\[a\\\\b\\]`);
        expect(normalizeHtml(ast)).toEqual(
            // normalizeHtml(`<div class="display-math">a\\\\b</div>`)
            normalizeHtml(`<me>a\\\\b</me>`) // needs to be wrapped by <p></p>
        );
    });

    it("Ligatures that are nested inside of math mode are not replaced", () => {
        let ast;

        // Custom labels are handled
        ast = process(`$a\\text{\\#}b$`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<m>a\\text{\\#}b</m>`)
        );
    });

    it.skip("Pars are broken at display math", () => {
        let ast;

        ast = process(`x\n\ny\\[a\\\\b\\]z`);
        expect(normalizeHtml(ast)).toEqual(
            // normalizeHtml(
            //     `<p>x</p><p>y</p><div class="display-math">a\\\\b</div><p>z</p>`
            // )
            normalizeHtml(`<p>x</p><p>y</p><p><me>a\\\\b</me></p><p>z</p>`)
        );
    });
    it.skip("Converts tabular environment with same column alignments", () => {
        html = process(`\\begin{tabular}{l l}a & b\\\\c & d\\end{tabular}`);
        expect(normalizeHtml(html)).toEqual(
            // normalizeHtml(
            //     `<table class="tabular">
            //     <tbody>
            //         <tr>
            //             <td>a</td>
            //             <td>b</td>
            //         </tr>
            //         <tr>
            //             <td>c</td>
            //             <td>d</td>
            //         </tr>
            //     </tbody>
            // </table>`
            // )

            // centered tho
            normalizeHtml(
                `<tabular>
                    <row>
                        <cell>a</cell>
                        <cell>b</cell>
                    </row>
                    <row>
                        <cell>c</cell>
                        <cell>d</cell>
                    </row>
                </tabular>`
            )
        );
    });

    it.skip("Converts tabular environment with different column alignments", () => {
        html = process(`\\begin{tabular}{r l}a & b\\\\c & d\\end{tabular}`);
        expect(normalizeHtml(html)).toEqual(
            // note: even though only one col is right aligned, need all cols
            normalizeHtml(
                `<tabular>
                    <col halign="right"/>
                    <col/>
                    <row>
                        <cell>a</cell>
                        <cell>b</cell>
                    </row>
                    <row>
                        <cell>c</cell>
                        <cell>d</cell>
                    </row>
                </tabular>`
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
            normalizeHtml(`<p>a</p><title>foo</title><p>b</p><p>c</p>`)
        );
        html = process(`a\\section{foo} b\\section{bar}\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(
                `<p>a</p><title>foo</title><p>b</p><title>bar</title><p>c</p>`
            )
        );
        html = process(`a\n \\emph{b}\n\nc`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a <em>b</em></p><p>c</p>`)
        );
        html = process(`a\n b\\begin{foo}x\\end{foo}c\n\nd`);
        expect(normalizeHtml(html)).toEqual(
            normalizeHtml(`<p>a b</p><div>x</div><p>c</p><p>d</p>`)
        );
    });

    // output used <m> inline instead
    it.skip("Macros aren't replaced with html code in math mode", () => {
        let ast;

        // Custom labels are handled
        ast = process(`\\[a\\\\b\\]`);
        expect(normalizeHtml(ast)).toEqual(
            // normalizeHtml(`<div class="display-math">a\\\\b</div>`)
            normalizeHtml(`<me>a\\\\b</me>`) // needs to be wrapped by <p></p>
        );
    });

    it("Ligatures that are nested inside of math mode are not replaced", () => {
        let ast;

        // Custom labels are handled
        ast = process(`$a\\text{\\#}b$`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<m>a\\text{\\#}b</m>`)
        );
    });

    it.skip("Pars are broken at display math", () => {
        let ast;

        ast = process(`x\n\ny\\[a\\\\b\\]z`);
        expect(normalizeHtml(ast)).toEqual(
            // normalizeHtml(
            //     `<p>x</p><p>y</p><div class="display-math">a\\\\b</div><p>z</p>`
            // )
            normalizeHtml(`<p>x</p><p>y</p><p><me>a\\\\b</me></p><p>z</p>`)
        );
    });
    it.skip("replaces command inside argument", () => {
        let ast;

        ast = process(`\\emph{\\bfseries b}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml('<em><b class="textbf">b</b></em>')
        );
    });
    it.skip("replaces command inside enumerate", () => {
        let ast;

        ast = process(`\\begin{enumerate}\\item\\bfseries b\\end{enumerate}`);
        expect(normalizeHtml(ast)).toEqual(
            // normalizeHtml(`<ol class="enumerate">
            //                     <li>
            //                     <p><b class="textbf">b</b></p>
            //                     </li>
            //                 </ol>`)
            normalizeHtml(`<ol>
                            <li>
                                <p><em>b</em></p>
                            </li>
                        </ol>`)
        );
    });
    it("replaces paragraphs", () => {
        let ast;

        ast = process(`\\paragraph{Important.} Paragraph`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`
                <title>Important.</title> Paragraph
            `) 
        );
    });
    it("custom replacers work", () => {
        const process = (value: string) =>
            processLatexViaUnified({ macros: { xxx: { signature: "m m" } } })
                .use(unifiedLatexToPretext, {
                    macroReplacements: {
                        xxx: (node) =>
                            htmlLike({
                                tag: "xxx",
                                attributes: Object.fromEntries(
                                    (node.args || []).map((x, i) => [
                                        `arg${i}`,
                                        printRaw(x.content),
                                    ])
                                ),
                            }),
                        textbf: (node) =>
                            htmlLike({
                                tag: "my-bold",
                                content: node.args?.[0]?.content || [],
                            }),
                    },
                    environmentReplacements: {
                        yyy: (node) =>
                            htmlLike({ tag: "yyy", content: node.content }),
                    },
                    producePretextFragment: true,
                })
                .use(xmlCompilePlugin)
                .processSync({ value }).value as string;
        let ast;

        ast = process(`\\xxx{a}{b}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<xxx arg0="a" arg1="b"></xxx>`)
        );

        ast = process(`\\begin{yyy}a\\end{yyy}`);
        expect(normalizeHtml(ast)).toEqual(normalizeHtml(`<yyy>a</yyy>`));

        // Can override default-defined macros
        ast = process(`\\textbf{a}`);
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<my-bold>a</my-bold>`)
        );
    });
    it("can use VisitInfo to render nodes differently depending on the parent", () => {
        const process = (value: string) =>
            processLatexViaUnified()
                .use(unifiedLatexToPretext, {
                    environmentReplacements: {
                        yyy: (node, info) => {
                            if (
                                info.parents.some((x) =>
                                    match.environment(x, "yyy")
                                )
                            ) {
                                return htmlLike({
                                    tag: "yyy-child",
                                    content: node.content,
                                });
                            }
                            return htmlLike({
                                tag: "yyy",
                                content: node.content,
                            });
                        },
                    },
                    producePretextFragment: true,
                })
                .use(xmlCompilePlugin)
                .processSync({ value }).value as string;
        let ast;

        ast = process(
            `\\begin{yyy}a\\end{yyy}\\begin{yyy}\\begin{yyy}b\\end{yyy}c\\end{yyy}`
        );
        expect(normalizeHtml(ast)).toEqual(
            normalizeHtml(`<yyy>a</yyy><yyy><yyy-child>b</yyy-child>c</yyy>`)
        );
    });
});
