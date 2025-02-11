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
        return Prettier.format(str, { parser: "html", plugins: ["@prettier/plugin-xml"] })
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

    it("wrap pars and streaming commands", () => {
        html = process("a\n\nb");
        expect(html).toEqual("<p>a</p><p>b</p>");

        html = process("\\bfseries a\n\nb");
        expect(html).toEqual("<p><alert>a</alert></p><p><alert>b</alert></p>");

        html = process("\\bf a\n\nb");
        expect(html).toEqual("<p><alert>a</alert></p><p><alert>b</alert></p>");
    });

    it("Can replace text-style macros", async () => {
        html = process(String.raw`a \textbf{different} word`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a <alert>different</alert> word`)
        );

        html = process(String.raw`a \textsf{different} word`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a <em>different</em> word`)
        );

        html = process(String.raw`a \textrm{different} word`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a <em>different</em> word`)
        );

        html = process(String.raw`a \emph{different} word`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a <em>different</em> word`)
        );
    });

    it("Can replace headings", async () => {
        html = process(String.raw`\chapter{My Chapter}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<chapter><title>My Chapter</title></chapter>`)
        );

        html = process(String.raw`\section{My Section}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<section><title>My Section</title></section>`)
        );

        html = process(String.raw`\section*{My Section}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<section><title>My Section</title></section>`)
        );
    });

    it("Comments are removed from HTML", async () => {
        html = process(`a % foo\nb`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`a b`));

        html = process(`a% foo\nb`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`ab`));

        html = process(`a% foo\n\nb`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`<p>a</p><p>b</p>`));

        html = process(`a % foo\n\nb`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`<p>a</p><p>b</p>`));
    });

    it("Wraps URLs", async () => {
        html = process(`a\\url{foo.com}b`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a<url href="foo.com">foo.com</url>b`)
        );

        html = process(`a\\href{foo.com}{FOO}b`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a<url href="foo.com">FOO</url>b`)
        );
    });

    it("Converts enumerate environments", async () => {
        html = process(`\\begin{enumerate}\\item a\\item b\\end{enumerate}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<ol><li><p>a</p></li><li><p>b</p></li></ol>`)
        );

        // Any content before an \item is ignored
        html = process(
            `\\begin{enumerate}before content\\item a\\item b\\end{enumerate}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<ol><li><p>a</p></li><li><p>b</p></li></ol>`)
        );

        // Custom labels are handled
        html = process(
            `\\begin{enumerate}before content\\item[x)] a\\item[] b\\end{enumerate}`
        );

        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<dl>
                    <li><title>x)</title><p>a</p></li>
                    <li><title/><p>b</p></li>
                </dl>`
            )
        );
    });

    it("Converts itemize environments", async () => {
        html = process(`\\begin{itemize}\\item a\\item b\\end{itemize}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<ul><li><p>a</p></li><li><p>b</p></li></ul>`)
        );

        // Any content before an \item is ignored
        html = process(
            `\\begin{itemize}before content\\item a\\item b\\end{itemize}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<ul><li><p>a</p></li><li><p>b</p></li></ul>`)
        );

        // Custom labels are handled
        html = process(
            `\\begin{itemize}before content\\item[x)] a\\item[] b\\end{itemize}`
        );

        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<dl>
                    <li><title>x)</title><p>a</p></li>
                    <li><title/><p>b</p></li>
                </dl>`
            )
        );
    });

    it("Converts tabular environment", async () => {
        html = process(`\\begin{tabular}{l l}a & b\\\\c & d\\end{tabular}`);

        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<tabular><row><cell>a</cell><cell>b</cell></row><row><cell>c</cell><cell>d</cell></row></tabular>`
            )
        );
    });

    it("Converts tabular environment with different column alignments and borders", async () => {
        html = process(`\\begin{tabular}{|r||l|}a & b\\\\c & d\\end{tabular}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<tabular left="minor"><col halign="right" right="minor"/><col right="minor"/>` +
                    `<row><cell>a</cell><cell>b</cell></row><row><cell>c</cell><cell>d</cell></row></tabular>`
            )
        );
    });

    it("Can wrap in <p>...</p> tags", async () => {
        html = process(`a\\par b`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`<p>a</p><p>b</p>`));

        html = process(`a\n\n b`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`<p>a</p><p>b</p>`));

        html = process(`a\n b\n\nc`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a b</p><p>c</p>`)
        );
        html = process(`a\\section{foo} b\n\nc`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<p>a</p><section><title>foo</title><p>b</p><p>c</p></section>`
            )
        );
        html = process(`a\\section{foo} b\\section{bar}\n\nc`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<p>a</p><section><title>foo</title><p>b</p></section><section><title>bar</title><p>c</p></section>`
            )
        );
        html = process(`a\n \\emph{b}\n\nc`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a <em>b</em></p><p>c</p>`)
        );
        html = process(`a\n b\\begin{foo}x\\end{foo}c\n\nd`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a b</p>x<p>c</p><p>d</p>`)
        );
    });

    it("Macros aren't replaced with html code in math mode", async () => {
        let ast;

        // Custom labels are handled
        ast = process(`\\[a\\\\b\\]`);
        expect(await normalizeHtml(ast)).toEqual(await normalizeHtml(`<me>a\\\\b</me>`));
    });

    it("Ligatures that are nested inside of math mode are not replaced", async () => {
        let ast;

        // Custom labels are handled
        ast = process(`$a\\text{\\#}b$`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<m>a\\text{\\#}b</m>`)
        );
    });

    it("Pars are broken at display math", async () => {
        let ast;

        ast = process(`x\n\ny\\[a\\\\b\\]z`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<p>x</p><p>y<me>a\\\\b</me>z</p>`)
        );
    });
    it("replaces command inside argument", async () => {
        let ast;

        ast = process(`\\emph{\\bfseries b}`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml("<em><alert>b</alert></em>")
        );
    });

    it("replaces command inside enumerate", async () => {
        let ast;

        ast = process(`\\begin{enumerate}\\item\\bfseries b\\end{enumerate}`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<ol>
                            <li>
                                <p><alert>b</alert></p>
                            </li>
                        </ol>`)
        );
    });
    it("replaces paragraphs", async () => {
        let ast;

        ast = process(`\\paragraph{Important.} Paragraph`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(
                `<paragraphs><title>Important.</title> Paragraph</paragraphs>`
            )
        );
    });
    it("custom replacers work", async () => {
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
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<xxx arg0="a" arg1="b"/>`)
        );

        ast = process(`\\begin{yyy}a\\end{yyy}`);
        expect(await normalizeHtml(ast)).toEqual(await normalizeHtml(`<yyy>a</yyy>`));

        // Can override default-defined macros
        ast = process(`\\textbf{a}`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<my-bold>a</my-bold>`)
        );
    });
    it("can use VisitInfo to render nodes differently depending on the parent", async () => {
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
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<yyy>a</yyy><yyy><yyy-child>b</yyy-child>c</yyy>`)
        );
    });
    it("converts theorem-like environments that have statements in ptx", async () => {
        html = process(`\\begin{lemma}\na\n\nb\n\\end{lemma}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<lemma><statement><p>a</p><p>b</p></statement></lemma>`
            )
        );
    });
    it("converts dfn to definition block", async () => {
        html = process(`\\begin{dfn}\na\n\\end{dfn}`);
        expect(await normalizeHtml(html)).toEqual(
           await normalizeHtml(
                `<definition><statement><p>a</p></statement></definition>`
            )
        );
    });
    it("Gives a theorem a title", async () => {
        html = process(`\\begin{theorem}[My Theorem]\na\n\nb\n\\end{theorem}`);
        expect(await normalizeHtml(html)).toEqual(
           await normalizeHtml(
                `<theorem><title>My Theorem</title><statement><p>a</p><p>b</p></statement></theorem>`
            )
        );
    });
    it("Gives an environment without statement a title", async () => {
        html = process(`\\begin{remark}[My remark]\na\n\\end{remark}`);
        return expect(await normalizeHtml(html)).toEqual(
           await normalizeHtml(`<remark><title>My remark</title><p>a</p></remark>`)
        );
    });
    it("Replaces \\ref with a xref", async () => {
        html = process(`Exercise \\ref{foo} is important`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`Exercise <xref ref="foo" text="global"/> is important`)
        );
    });
    it("Replaces \\cref and \\Cref with a bare xref", async () => {
        html = process(`As we saw in \\cref{foo}, we can do this.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`As we saw in <xref ref="foo"/>, we can do this.`)
        );

        html = process(`As we saw in \\Cref{foo}, we can do this.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`As we saw in <xref ref="foo" />, we can do this.`)
        );
    });
    it("Replaces \\cite with a xref", async () => {
        html = process(`See \\cite{foo} for more`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`See <xref ref="foo" /> for more`)
        );
    });
    it("Replaces \\latex with <latex/> etc.", async () => {
        html = process(`We can write in \\latex or \\tex and do so \\today.`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`We can write in <latex/> or <tex/> and do so <today/>.`));
    })
});
