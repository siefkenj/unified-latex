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
        return Prettier.format(str, {
            parser: "html",
            plugins: ["@prettier/plugin-xml"],
        });
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
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a</p><p>b</p>`)
        );

        html = process(`a % foo\n\nb`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a</p><p>b</p>`)
        );
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
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a</p><p>b</p>`)
        );

        html = process(`a\n\n b`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<p>a</p><p>b</p>`)
        );

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
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<md>a\\\\b</md>`)
        );
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
            await normalizeHtml(`<p>x</p><p>y<md>a\\\\b</md>z</p>`)
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
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<yyy>a</yyy>`)
        );

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
            await normalizeHtml(
                `<yyy>a</yyy><yyy><yyy-child>b</yyy-child>c</yyy>`
            )
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
    it("converts solution", async () => {
        html = process(`\\begin{solution}sol\n\\end{solution}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<solution><p>sol</p></solution>`
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
    it("places proof as sibling of statement inside theorem", async () => {
        html = process(
            `\\begin{theorem}Some statement.\\begin{proof}Proof text.\\end{proof}\\end{theorem}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<theorem><statement><p>Some statement.</p></statement><proof><p>Proof text.</p></proof></theorem>`
            )
        );
    });
    it("places proof as sibling of statement inside theorem with title", async () => {
        html = process(
            `\\begin{theorem}[My Theorem]Some statement.\\begin{proof}Proof text.\\end{proof}\\end{theorem}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<theorem><title>My Theorem</title><statement><p>Some statement.</p></statement><proof><p>Proof text.</p></proof></theorem>`
            )
        );
    });
    it("places multiple proofs as siblings of statement", async () => {
        html = process(
            `\\begin{theorem}Some statement.\\begin{proof}First proof.\\end{proof}\\begin{proof}Second proof.\\end{proof}\\end{theorem}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<theorem><statement><p>Some statement.</p></statement><proof><p>First proof.</p></proof><proof><p>Second proof.</p></proof></theorem>`
            )
        );
    });
    it("Gives an environment without statement a title", async () => {
        html = process(`\\begin{remark}[My remark]\na\n\\end{remark}`);
        return expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<remark><title>My remark</title><p>a</p></remark>`
            )
        );
    });
    it("converts aside environment", async () => {
        html = process(`\\begin{aside}[My aside]Some content.\\end{aside}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<aside><title>My aside</title><p>Some content.</p></aside>`)
        );
    });
    it("converts aside environment without title", async () => {
        html = process(`\\begin{aside}Some content.\\end{aside}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<aside><p>Some content.</p></aside>`)
        );
    });
    it("converts assemblage environment", async () => {
        html = process(`\\begin{assemblage}[Key Facts]Item one.\\end{assemblage}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<assemblage><title>Key Facts</title><p>Item one.</p></assemblage>`)
        );
    });
    it("converts activity environment", async () => {
        html = process(`\\begin{activity}[My Activity]Do this.\\end{activity}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<activity><title>My Activity</title><p>Do this.</p></activity>`)
        );
    });
    it("converts biographical environment", async () => {
        html = process(`\\begin{biographical}[Ada Lovelace]She was a mathematician.\\end{biographical}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<biographical><title>Ada Lovelace</title><p>She was a mathematician.</p></biographical>`)
        );
    });
    it("converts historical environment", async () => {
        html = process(`\\begin{historical}[History]Long ago.\\end{historical}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<historical><title>History</title><p>Long ago.</p></historical>`)
        );
    });
    it("converts computation environment", async () => {
        html = process(`\\begin{computation}Some computation.\\end{computation}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<computation><p>Some computation.</p></computation>`)
        );
    });
    it("converts technology environment", async () => {
        html = process(`\\begin{technology}[Tech note]Use this tool.\\end{technology}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<technology><title>Tech note</title><p>Use this tool.</p></technology>`)
        );
    });
    it("converts data environment", async () => {
        html = process(`\\begin{data}[Dataset]The values are.\\end{data}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<data><title>Dataset</title><p>The values are.</p></data>`)
        );
    });
    it("makes centered text into blockquotes", async () => {
        html = process(`\\begin{center}\na\n\nb\n\\end{center}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<blockquote><p>a</p><p>b</p></blockquote>`
            )
        );
    });
    it("Replaces \\ref with a xref", async () => {
        html = process(`Exercise \\ref{foo} is important`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `Exercise <xref ref="foo"/> is important`
            )
        );
    });
    it("Replaces \\eqref with a xref", async () => {
        html = process(`Exercise \\eqref{foo} is important`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `Exercise <xref ref="foo"/> is important`
            )
        );
    });
    it("Replaces \\cref and \\Cref with a bare xref", async () => {
        html = process(`As we saw in \\cref{foo}, we can do this.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `As we saw in <xref ref="foo"/>, we can do this.`
            )
        );

        html = process(`As we saw in \\Cref{foo}, we can do this.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `As we saw in <xref ref="foo" />, we can do this.`
            )
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
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `We can write in <latex/> or <tex/> and do so <today/>.`
            )
        );
    });
    it("Replaces \\term with <term> env", async () => {
        html = process(`We can write a \\term{specific term} when defining something.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `We can write a <term>specific term</term> when defining something.`
            )
        );
    });
    it("Handles index macros", async () => {
        html = process(`We can index a term with \\index{my term} or similar.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `We can index a term with <idx><h>my term</h></idx> or similar.`
            )
        );
    });
    it.skip("handles index macros with subheadings, see, and see also", async () => {

        html = process(`We can index a term with \\index{my term!my subterm} for subheadings.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `We can index a term with <idx><h>my term</h><h>my subterm</h></idx> for subheadings.`
            )
        );

        html = process(`We can index a term with \\index{my term|see {other term}}.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `We can index a term with <idx><h>my term</h><see>other term</see></idx> or similar.`
            )
        );

        html = process(`We can index a term with \\index{my term|seealso {other term}}.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `We can index a term with <idx><h>my term</h><seealso>other term</seealso></idx> or similar.`
            )
        );
    });
    it("Converts tables and figures with captions", async () => {
        html = process(`\\begin{table}\\caption{My table}\\begin{tabular}{l l}a & b\\\\c & d\\end{tabular}\\end{table}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<table><title>My table</title><tabular><row><cell>a</cell><cell>b</cell></row><row><cell>c</cell><cell>d</cell></row></tabular></table>`
            )
        );
        html = process(`\\begin{figure}\\caption{My figure}\\includegraphics{example.png}\\end{figure}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<figure><caption>My figure</caption><image source="example.png"/></figure>`
            )
        );
    });

    it("Turns labels into xml:id attributes and refs into xrefs", async () => {
        html = process(`\\section{My section}\\label{sec:my section}\n\nSee section \\ref{sec:my section}.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section xml:id="sec-my_section"><title>My section</title><p>See section <xref ref="sec-my_section"/>.</p></section>`
            )
        );

        html = process(`\\begin{theorem}\\label{thm:important}Important stuff.\\end{theorem}\n\nAs we saw in \\ref{thm:important}, this is important.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<theorem xml:id="thm-important"><statement><p>Important stuff.</p></statement></theorem><p>As we saw in <xref ref="thm-important"/>, this is important.</p>`
            )
        );
    });
    it("converts generator macros", async () => {
        const n = (s: string) => normalizeHtml(s);
        expect(await normalizeHtml(process(`\\eg`))).toEqual(await n(`<eg/>`));
        expect(await normalizeHtml(process(`\\ie`))).toEqual(await n(`<ie/>`));
        expect(await normalizeHtml(process(`\\etc`))).toEqual(await n(`<etc/>`));
        expect(await normalizeHtml(process(`\\XeTeX`))).toEqual(await n(`<xetex/>`));
        expect(await normalizeHtml(process(`\\XeLaTeX`))).toEqual(await n(`<xelatex/>`));
        expect(await normalizeHtml(process(`\\LuaTeX`))).toEqual(await n(`<luatex/>`));
        expect(await normalizeHtml(process(`\\PreTeXt`))).toEqual(await n(`<pretext/>`));
        expect(await normalizeHtml(process(`\\PreFigure`))).toEqual(await n(`<prefigure/>`));
        expect(await normalizeHtml(process(`\\AD`))).toEqual(await n(`<ad/>`));
        expect(await normalizeHtml(process(`\\BC`))).toEqual(await n(`<bc/>`));
        expect(await normalizeHtml(process(`\\AM`))).toEqual(await n(`<am/>`));
        expect(await normalizeHtml(process(`\\PM`))).toEqual(await n(`<pm/>`));
        expect(await normalizeHtml(process(`\\nb`))).toEqual(await n(`<nb/>`));
        expect(await normalizeHtml(process(`\\ps`))).toEqual(await n(`<ps/>`));
        expect(await normalizeHtml(process(`\\vs`))).toEqual(await n(`<vs/>`));
        expect(await normalizeHtml(process(`\\viz`))).toEqual(await n(`<viz/>`));
        expect(await normalizeHtml(process(`\\etal`))).toEqual(await n(`<etal/>`));
        expect(await normalizeHtml(process(`\\ca`))).toEqual(await n(`<ca/>`));
        expect(await normalizeHtml(process(`\\circa`))).toEqual(await n(`<ca/>`));
    });
    it("converts character/symbol macros", async () => {
        const n = (s: string) => normalizeHtml(s);
        expect(await normalizeHtml(process(`\\copyright`))).toEqual(await n(`<copyright/>`));
        expect(await normalizeHtml(process(`\\registered`))).toEqual(await n(`<registered/>`));
        expect(await normalizeHtml(process(`\\textregistered`))).toEqual(await n(`<registered/>`));
        expect(await normalizeHtml(process(`\\trademark`))).toEqual(await n(`<trademark/>`));
        expect(await normalizeHtml(process(`\\texttrademark`))).toEqual(await n(`<trademark/>`));
        expect(await normalizeHtml(process(`\\degree`))).toEqual(await n(`<degree/>`));
        expect(await normalizeHtml(process(`\\textdegree`))).toEqual(await n(`<degree/>`));
        expect(await normalizeHtml(process(`\\dagger`))).toEqual(await n(`<dagger/>`));
        expect(await normalizeHtml(process(`\\ldots`))).toEqual(await n(`<ellipsis/>`));
        expect(await normalizeHtml(process(`\\dots`))).toEqual(await n(`<ellipsis/>`));
        expect(await normalizeHtml(process(`\\textpm`))).toEqual(await n(`<plusminus/>`));
        expect(await normalizeHtml(process(`\\textsection`))).toEqual(await n(`<section-mark/>`));
        expect(await normalizeHtml(process(`\\textpilcrow`))).toEqual(await n(`<pilcrow/>`));
    });
    it("converts \\verb to inline <c>", async () => {
        html = process(`inline \\verb|x^2| code`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`inline <c>x^2</c> code`)
        );
    });
    it("converts verbatim environment to <pre>", async () => {
        html = process(`\\begin{verbatim}\nx = 1 + 2\n\\end{verbatim}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<pre>\nx = 1 + 2\n</pre>`)
        );
    });
    it("converts \\code{} macro to inline <c>", async () => {
        html = process(`inline \\code{x^2} code`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`inline <c>x^2</c> code`)
        );
    });
    it("converts \\begin{code} environment to <pre>", async () => {
        html = process(`\\begin{code}\nx = 1 + 2\n\\end{code}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<pre>x = 1 + 2</pre>`)
        );
    });
    it("converts inline text macros", async () => {
        expect(await normalizeHtml(process(`\\footnote{a note}`))).toEqual(await normalizeHtml(`<fn>a note</fn>`));
        expect(await normalizeHtml(process(`\\fn{a note}`))).toEqual(await normalizeHtml(`<fn>a note</fn>`));
        expect(await normalizeHtml(process(`\\q{quoted}`))).toEqual(await normalizeHtml(`<q>quoted</q>`));
        expect(await normalizeHtml(process(`\\enquote{quoted}`))).toEqual(await normalizeHtml(`<q>quoted</q>`));
        expect(await normalizeHtml(process(`\\sq{quoted}`))).toEqual(await normalizeHtml(`<sq>quoted</sq>`));
        expect(await normalizeHtml(process(`\\enquotestar{quoted}`))).toEqual(await normalizeHtml(`<sq>quoted</sq>`));
        expect(await normalizeHtml(process(`\\abbr{DNA}`))).toEqual(await normalizeHtml(`<abbr>DNA</abbr>`));
        expect(await normalizeHtml(process(`\\acro{NATO}`))).toEqual(await normalizeHtml(`<acro>NATO</acro>`));
        expect(await normalizeHtml(process(`\\foreign{sine qua non}`))).toEqual(await normalizeHtml(`<foreign>sine qua non</foreign>`));
        expect(await normalizeHtml(process(`\\foreignlanguage{latin}{sine qua non}`))).toEqual(await normalizeHtml(`<foreign>sine qua non</foreign>`));
        expect(await normalizeHtml(process(`\\pubtitle{Calculus}`))).toEqual(await normalizeHtml(`<pubtitle>Calculus</pubtitle>`));
        expect(await normalizeHtml(process(`\\booktitle{Calculus}`))).toEqual(await normalizeHtml(`<pubtitle>Calculus</pubtitle>`));
        expect(await normalizeHtml(process(`\\articletitle{My Paper}`))).toEqual(await normalizeHtml(`<articletitle>My Paper</articletitle>`));
        expect(await normalizeHtml(process(`\\xmltag{section}`))).toEqual(await normalizeHtml(`<tag>section</tag>`));
        expect(await normalizeHtml(process(`\\xmlattr{xml:id}`))).toEqual(await normalizeHtml(`<attr>xml:id</attr>`));
    });
    it("converts misc inline macros", async () => {
        expect(await normalizeHtml(process(`\\taxon{Homo sapiens}`))).toEqual(await normalizeHtml(`<taxon>Homo sapiens</taxon>`));
        expect(await normalizeHtml(process(`\\kbd{Ctrl+C}`))).toEqual(await normalizeHtml(`<kbd>Ctrl+C</kbd>`));
        const n = (s: string) => normalizeHtml(s);
        expect(await normalizeHtml(process(`\\fillin`))).toEqual(await n(`<fillin/>`));
        // lstinline → <c>
        expect(await normalizeHtml(process(`use \\lstinline{x = 1} here`))).toEqual(await normalizeHtml(`use <c>x = 1</c> here`));
    });
    it("converts tracked-change macros", async () => {
        expect(await normalizeHtml(process(`\\sout{old text}`))).toEqual(await normalizeHtml(`<delete>old text</delete>`));
        expect(await normalizeHtml(process(`\\insert{new text}`))).toEqual(await normalizeHtml(`<insert>new text</insert>`));
        expect(await normalizeHtml(process(`\\stale{stale text}`))).toEqual(await normalizeHtml(`<stale>stale text</stale>`));
    });

    // Division environments with macro-style and environment-style
    it("converts \\preface{title} macro to <preface>", async () => {
        html = process(`\\preface{My Preface}\n\nSome introductory content.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<preface><title>My Preface</title><p>Some introductory content.</p></preface>`)
        );
    });
    it("converts \\begin{preface} environment to <preface>", async () => {
        html = process(`\\begin{preface}[My Preface]\n\nSome introductory content.\n\\end{preface}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<preface><title>My Preface</title><p>Some introductory content.</p></preface>`)
        );
    });
    it("converts \\biography{title} macro to <biography>", async () => {
        html = process(`\\biography{Ada Lovelace}\n\nShe was a mathematician.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<biography><title>Ada Lovelace</title><p>She was a mathematician.</p></biography>`)
        );
    });
    it("converts \\dedication{title} macro to <dedication>", async () => {
        html = process(`\\dedication{To my students}\n\nWith gratitude.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<dedication><title>To my students</title><p>With gratitude.</p></dedication>`)
        );
    });
    it("converts \\exercises{title} macro to <exercises>", async () => {
        html = process(`\\exercises{Exercises for Section 1}\n\nSome exercises here.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<exercises><title>Exercises for Section 1</title><p>Some exercises here.</p></exercises>`)
        );
    });
    it("converts \\worksheet{title} macro to <worksheet>", async () => {
        html = process(`\\worksheet{Lab 1}\n\nDo problems 1-5.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<worksheet><title>Lab 1</title><p>Do problems 1-5.</p></worksheet>`)
        );
    });
    it("converts \\readingquestions{title} macro to <reading-questions>", async () => {
        html = process(`\\readingquestions{Reading Questions}\n\nWhat did you learn?`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<reading-questions><title>Reading Questions</title><p>What did you learn?</p></reading-questions>`)
        );
    });
    it("converts \\begin{exercises} environment to <exercises>", async () => {
        html = process(`\\begin{exercises}[More Exercises]\n\nExercise content.\n\\end{exercises}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<exercises><title>More Exercises</title><p>Exercise content.</p></exercises>`)
        );
    });
    it("converts \\begin{introduction} environment to <introduction>", async () => {
        html = process(`\\begin{introduction}\n\nThis section covers basics.\n\\end{introduction}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<introduction><p>This section covers basics.</p></introduction>`)
        );
    });
    it("converts \\begin{conclusion} environment to <conclusion>", async () => {
        html = process(`\\begin{conclusion}\n\nIn summary.\n\\end{conclusion}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<conclusion><p>In summary.</p></conclusion>`)
        );
    });
    it("converts \\begin{objectives} and \\begin{outcomes} environments", async () => {
        html = process(`\\begin{objectives}\n\nLearn to code.\n\\end{objectives}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<objectives><p>Learn to code.</p></objectives>`)
        );
        html = process(`\\begin{outcomes}\n\nStudents will understand X.\n\\end{outcomes}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<outcomes><p>Students will understand X.</p></outcomes>`)
        );
    });
    it("converts \\begin{reading-questions} environment to <reading-questions>", async () => {
        html = process(`\\begin{reading-questions}\n\nWhat did you read?\n\\end{reading-questions}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<reading-questions><p>What did you read?</p></reading-questions>`)
        );
    });
    it("converts \\begin{paragraphs} environment to <paragraphs>", async () => {
        html = process(`\\begin{paragraphs}[A Titled Aside]\n\nSome paragraph.\n\\end{paragraphs}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<paragraphs><title>A Titled Aside</title><p>Some paragraph.</p></paragraphs>`)
        );
    });
    it("converts multiple peer divisions at the same level", async () => {
        html = process(`\\section{Intro}\n\nIntro text.\n\n\\exercises{Practice}\n\nExercise text.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<section><title>Intro</title><p>Intro text.</p></section><exercises><title>Practice</title><p>Exercise text.</p></exercises>`)
        );
    });

    // Group D: complex environments
    it("converts \\begin{poem} to <poem> with stanzas and lines", async () => {
        html = process(
            `\\begin{poem}[The Road]\nTwo roads diverged\\\\\nIn a yellow wood.\n\nAnd sorry I could not\\\\\nTravel both.\n\\end{poem}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<poem><title>The Road</title><stanza><line>Two roads diverged</line><line>In a yellow wood.</line></stanza><stanza><line>And sorry I could not</line><line>Travel both.</line></stanza></poem>`
            )
        );
    });
    it("converts \\begin{sidebyside} to <sidebyside>", async () => {
        html = process(`\\begin{sidebyside}\n\nLeft content.\n\nRight content.\n\\end{sidebyside}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<sidebyside><p>Left content.</p><p>Right content.</p></sidebyside>`)
        );
    });
    it("converts \\begin{program} to <program><input>", async () => {
        html = process(`\\begin{program}[python]\nx = 1 + 2\n\\end{program}`);
        // Use trim comparison — normalizeHtml can't handle <input> (HTML void element)
        expect(html.trim()).toEqual(`<program language="python"><input>x = 1 + 2</input></program>`);
    });
    it("converts \\begin{program} without language", async () => {
        html = process(`\\begin{program}\nx = 1\n\\end{program}`);
        expect(html.trim()).toEqual(`<program><input>x = 1</input></program>`);
    });
    it("converts \\begin{console} to <console>", async () => {
        html = process(`\\begin{console}\n$ echo hello\nhello\n\\end{console}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<console>$ echo hello\nhello</console>`)
        );
    });
    it("converts \\begin{sage} to <sage><input>", async () => {
        html = process(`\\begin{sage}\nplot(sin(x), x, 0, 2*pi)\n\\end{sage}`);
        // Use trim comparison — normalizeHtml can't handle <input> (HTML void element)
        expect(html.trim()).toEqual(`<sage><input>plot(sin(x), x, 0, 2*pi)</input></sage>`);
    });
    it("converts \\begin{webwork} to <webwork>", async () => {
        html = process(`\\begin{webwork}\nSome webwork content.\n\\end{webwork}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<webwork><p>Some webwork content.</p></webwork>`)
        );
    });
    it("converts \\begin{task} to <task> with statement and optional hint/answer/solution", async () => {
        html = process(`\\begin{task}[Find the derivative]\n\nCompute $f'(x)$.\n\\end{task}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<task><title>Find the derivative</title><statement><p>Compute <m>f'(x)</m>.</p></statement></task>`)
        );
        html = process(`\\begin{task}\n\nContent.\n\n\\begin{hint}A hint.\\end{hint}\n\\end{task}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<task><statement><p>Content.</p></statement><hint><p>A hint.</p></hint></task>`)
        );
    });
    it("converts \\begin{solutions} environment and \\solutions{title} macro", async () => {
        html = process(`\\begin{solutions}[Solutions to Section 1]\n\nSome solutions.\n\\end{solutions}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<solutions><title>Solutions to Section 1</title><p>Some solutions.</p></solutions>`)
        );
        html = process(`\\solutions{Chapter Solutions}\n\nSolution content.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<solutions><title>Chapter Solutions</title><p>Solution content.</p></solutions>`)
        );
    });
    it("converts \\begin{gi} glossary item", async () => {
        html = process(`\\begin{gi}\n\nA glossary term and definition.\n\\end{gi}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<gi><p>A glossary term and definition.</p></gi>`)
        );
    });
    it("converts \\begin{sbsgroup} and \\begin{stack}", async () => {
        html = process(`\\begin{sbsgroup}\n\nSide by side content.\n\\end{sbsgroup}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<sbsgroup><p>Side by side content.</p></sbsgroup>`)
        );
        html = process(`\\begin{stack}\n\nStacked content.\n\\end{stack}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<stack><p>Stacked content.</p></stack>`)
        );
    });
    it("converts \\begin{listing} named code container", async () => {
        html = process(`\\begin{listing}\\caption{My Code}\\begin{verbatim}\nx = 1\n\\end{verbatim}\\end{listing}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<listing><caption>My Code</caption><pre>\nx = 1\n</pre></listing>`)
        );
    });

    // Quote ligature conversion
    it("converts ``...'' double-quote ligatures to <q>", async () => {
        html = process("He said ``hello'' to her.");
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml("He said <q>hello</q> to her.")
        );
    });
    it("converts `...' single-quote ligatures to <sq>", async () => {
        html = process("He said `hello' to her.");
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml("He said <sq>hello</sq> to her.")
        );
    });
    it("preserves contractions and possessives", () => {
        html = process("don't and it's and author's");
        expect(html.trim()).toEqual("don't and it's and author's");
    });
    it("handles nested double inside double quotes", async () => {
        html = process("``outer ``inner'' text''");
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml("<q>outer <q>inner</q> text</q>")
        );
    });
    it("handles single quotes inside double quotes", async () => {
        html = process("``He said `yes' to me.''");
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml("<q>He said <sq>yes</sq> to me.</q>")
        );
    });
    it("does not match quotes across paragraph breaks", async () => {
        html = process("``first paragraph\n\nsecond paragraph''");
        // The unmatched `` becomes <lq/> and '' becomes <rq/> — no wrapping <q>
        expect(html).not.toContain("<q>");
    });
    it("does not convert quotes in math mode", async () => {
        html = process("$f'(x)$ and $g''(x)$");
        // Primes in math should not become quotes
        expect(html).not.toContain("<q>");
        expect(html).not.toContain("<sq>");
    });
    it("handles multiple quote pairs in sequence", async () => {
        html = process("``one'' and ``two''");
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml("<q>one</q> and <q>two</q>")
        );
    });
    it("preserves contraction inside single-quoted phrase", () => {
        html = process("`don't say that'");
        expect(html.trim()).toEqual("<sq>don't say that</sq>");
    });
    it("converts -- to <ndash/> and --- to <mdash/>", () => {
        html = process("pages 1--10 and an em---dash");
        expect(html.trim()).toEqual("pages 1<ndash />10 and an em<mdash />dash");
    });
    it("converts ~ to <nbsp/>", () => {
        html = process("Dr.~Smith");
        expect(html.trim()).toEqual("Dr.<nbsp />Smith");
    });
    it("converts \\verb to inline <c>", async () => {
        html = process(`inline \\verb|x^2| code`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`inline <c>x^2</c> code`)
        );
    });
    it("converts verbatim environment to <pre>", async () => {
        html = process(`\\begin{verbatim}\nx = 1 + 2\n\\end{verbatim}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<pre>\nx = 1 + 2\n</pre>`)
        );
    });
    it("converts \\code{} macro to inline <c>", async () => {
        html = process(`inline \\code{x^2} code`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`inline <c>x^2</c> code`)
        );
    });
    it("converts \\begin{code} environment to <pre>", async () => {
        html = process(`\\begin{code}\nx = 1 + 2\n\\end{code}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<pre>x = 1 + 2</pre>`)
        );
    });
    it("converts inline text macros", async () => {
        expect(await normalizeHtml(process(`\\footnote{a note}`))).toEqual(await normalizeHtml(`<fn>a note</fn>`));
        expect(await normalizeHtml(process(`\\fn{a note}`))).toEqual(await normalizeHtml(`<fn>a note</fn>`));
        expect(await normalizeHtml(process(`\\q{quoted}`))).toEqual(await normalizeHtml(`<q>quoted</q>`));
        expect(await normalizeHtml(process(`\\enquote{quoted}`))).toEqual(await normalizeHtml(`<q>quoted</q>`));
        expect(await normalizeHtml(process(`\\sq{quoted}`))).toEqual(await normalizeHtml(`<sq>quoted</sq>`));
        expect(await normalizeHtml(process(`\\enquotestar{quoted}`))).toEqual(await normalizeHtml(`<sq>quoted</sq>`));
        expect(await normalizeHtml(process(`\\abbr{DNA}`))).toEqual(await normalizeHtml(`<abbr>DNA</abbr>`));
        expect(await normalizeHtml(process(`\\acro{NATO}`))).toEqual(await normalizeHtml(`<acro>NATO</acro>`));
        expect(await normalizeHtml(process(`\\foreign{sine qua non}`))).toEqual(await normalizeHtml(`<foreign>sine qua non</foreign>`));
        expect(await normalizeHtml(process(`\\foreignlanguage{latin}{sine qua non}`))).toEqual(await normalizeHtml(`<foreign>sine qua non</foreign>`));
        expect(await normalizeHtml(process(`\\pubtitle{Calculus}`))).toEqual(await normalizeHtml(`<pubtitle>Calculus</pubtitle>`));
        expect(await normalizeHtml(process(`\\booktitle{Calculus}`))).toEqual(await normalizeHtml(`<pubtitle>Calculus</pubtitle>`));
        expect(await normalizeHtml(process(`\\articletitle{My Paper}`))).toEqual(await normalizeHtml(`<articletitle>My Paper</articletitle>`));
        expect(await normalizeHtml(process(`\\xmltag{section}`))).toEqual(await normalizeHtml(`<tag>section</tag>`));
        expect(await normalizeHtml(process(`\\xmlattr{xml:id}`))).toEqual(await normalizeHtml(`<attr>xml:id</attr>`));
    });
    it("converts misc inline macros", async () => {
        expect(await normalizeHtml(process(`\\taxon{Homo sapiens}`))).toEqual(await normalizeHtml(`<taxon>Homo sapiens</taxon>`));
        expect(await normalizeHtml(process(`\\kbd{Ctrl+C}`))).toEqual(await normalizeHtml(`<kbd>Ctrl+C</kbd>`));
        const n = (s: string) => normalizeHtml(s);
        expect(await normalizeHtml(process(`\\fillin`))).toEqual(await n(`<fillin/>`));
        // lstinline → <c>
        expect(await normalizeHtml(process(`use \\lstinline{x = 1} here`))).toEqual(await normalizeHtml(`use <c>x = 1</c> here`));
    });
    it("converts tracked-change macros", async () => {
        expect(await normalizeHtml(process(`\\sout{old text}`))).toEqual(await normalizeHtml(`<delete>old text</delete>`));
        expect(await normalizeHtml(process(`\\insert{new text}`))).toEqual(await normalizeHtml(`<insert>new text</insert>`));
        expect(await normalizeHtml(process(`\\stale{stale text}`))).toEqual(await normalizeHtml(`<stale>stale text</stale>`));
    });

    // Division environments with macro-style and environment-style
    it("converts \\preface{title} macro to <preface>", async () => {
        html = process(`\\preface{My Preface}\n\nSome introductory content.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<preface><title>My Preface</title><p>Some introductory content.</p></preface>`)
        );
    });
    it("converts \\begin{preface} environment to <preface>", async () => {
        html = process(`\\begin{preface}[My Preface]\n\nSome introductory content.\n\\end{preface}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<preface><title>My Preface</title><p>Some introductory content.</p></preface>`)
        );
    });
    it("converts \\biography{title} macro to <biography>", async () => {
        html = process(`\\biography{Ada Lovelace}\n\nShe was a mathematician.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<biography><title>Ada Lovelace</title><p>She was a mathematician.</p></biography>`)
        );
    });
    it("converts \\dedication{title} macro to <dedication>", async () => {
        html = process(`\\dedication{To my students}\n\nWith gratitude.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<dedication><title>To my students</title><p>With gratitude.</p></dedication>`)
        );
    });
    it("converts \\exercises{title} macro to <exercises>", async () => {
        html = process(`\\exercises{Exercises for Section 1}\n\nSome exercises here.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<exercises><title>Exercises for Section 1</title><p>Some exercises here.</p></exercises>`)
        );
    });
    it("converts \\worksheet{title} macro to <worksheet>", async () => {
        html = process(`\\worksheet{Lab 1}\n\nDo problems 1-5.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<worksheet><title>Lab 1</title><p>Do problems 1-5.</p></worksheet>`)
        );
    });
    it("converts \\readingquestions{title} macro to <reading-questions>", async () => {
        html = process(`\\readingquestions{Reading Questions}\n\nWhat did you learn?`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<reading-questions><title>Reading Questions</title><p>What did you learn?</p></reading-questions>`)
        );
    });
    it("converts \\begin{exercises} environment to <exercises>", async () => {
        html = process(`\\begin{exercises}[More Exercises]\n\nExercise content.\n\\end{exercises}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<exercises><title>More Exercises</title><p>Exercise content.</p></exercises>`)
        );
    });
    it("converts \\begin{introduction} environment to <introduction>", async () => {
        html = process(`\\begin{introduction}\n\nThis section covers basics.\n\\end{introduction}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<introduction><p>This section covers basics.</p></introduction>`)
        );
    });
    it("converts \\begin{conclusion} environment to <conclusion>", async () => {
        html = process(`\\begin{conclusion}\n\nIn summary.\n\\end{conclusion}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<conclusion><p>In summary.</p></conclusion>`)
        );
    });
    it("converts \\begin{objectives} and \\begin{outcomes} environments", async () => {
        html = process(`\\begin{objectives}\n\nLearn to code.\n\\end{objectives}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<objectives><p>Learn to code.</p></objectives>`)
        );
        html = process(`\\begin{outcomes}\n\nStudents will understand X.\n\\end{outcomes}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<outcomes><p>Students will understand X.</p></outcomes>`)
        );
    });
    it("converts \\begin{reading-questions} environment to <reading-questions>", async () => {
        html = process(`\\begin{reading-questions}\n\nWhat did you read?\n\\end{reading-questions}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<reading-questions><p>What did you read?</p></reading-questions>`)
        );
    });
    it("converts \\begin{paragraphs} environment to <paragraphs>", async () => {
        html = process(`\\begin{paragraphs}[A Titled Aside]\n\nSome paragraph.\n\\end{paragraphs}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<paragraphs><title>A Titled Aside</title><p>Some paragraph.</p></paragraphs>`)
        );
    });
    it("converts multiple peer divisions at the same level", async () => {
        html = process(`\\section{Intro}\n\nIntro text.\n\n\\exercises{Practice}\n\nExercise text.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<section><title>Intro</title><p>Intro text.</p></section><exercises><title>Practice</title><p>Exercise text.</p></exercises>`)
        );
    });

    // Group D: complex environments
    it("converts \\begin{poem} to <poem> with stanzas and lines", async () => {
        html = process(
            `\\begin{poem}[The Road]\nTwo roads diverged\\\\\nIn a yellow wood.\n\nAnd sorry I could not\\\\\nTravel both.\n\\end{poem}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<poem><title>The Road</title><stanza><line>Two roads diverged</line><line>In a yellow wood.</line></stanza><stanza><line>And sorry I could not</line><line>Travel both.</line></stanza></poem>`
            )
        );
    });
    it("converts \\begin{sidebyside} to <sidebyside>", async () => {
        html = process(`\\begin{sidebyside}\n\nLeft content.\n\nRight content.\n\\end{sidebyside}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<sidebyside><p>Left content.</p><p>Right content.</p></sidebyside>`)
        );
    });
    it("converts \\begin{program} to <program><input>", async () => {
        html = process(`\\begin{program}[python]\nx = 1 + 2\n\\end{program}`);
        // Use trim comparison — normalizeHtml can't handle <input> (HTML void element)
        expect(html.trim()).toEqual(`<program language="python"><input>x = 1 + 2</input></program>`);
    });
    it("converts \\begin{program} without language", async () => {
        html = process(`\\begin{program}\nx = 1\n\\end{program}`);
        expect(html.trim()).toEqual(`<program><input>x = 1</input></program>`);
    });
    it("converts \\begin{console} to <console>", async () => {
        html = process(`\\begin{console}\n$ echo hello\nhello\n\\end{console}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<console>$ echo hello\nhello</console>`)
        );
    });
    it("converts \\begin{sage} to <sage><input>", async () => {
        html = process(`\\begin{sage}\nplot(sin(x), x, 0, 2*pi)\n\\end{sage}`);
        // Use trim comparison — normalizeHtml can't handle <input> (HTML void element)
        expect(html.trim()).toEqual(`<sage><input>plot(sin(x), x, 0, 2*pi)</input></sage>`);
    });
    it("converts \\begin{webwork} to <webwork>", async () => {
        html = process(`\\begin{webwork}\nSome webwork content.\n\\end{webwork}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<webwork><p>Some webwork content.</p></webwork>`)
        );
    });
    it("converts \\begin{task} to <task> with statement and optional hint/answer/solution", async () => {
        html = process(`\\begin{task}[Find the derivative]\n\nCompute $f'(x)$.\n\\end{task}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<task><title>Find the derivative</title><statement><p>Compute <m>f'(x)</m>.</p></statement></task>`)
        );
        html = process(`\\begin{task}\n\nContent.\n\n\\begin{hint}A hint.\\end{hint}\n\\end{task}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<task><statement><p>Content.</p></statement><hint><p>A hint.</p></hint></task>`)
        );
    });
    it("converts \\begin{solutions} environment and \\solutions{title} macro", async () => {
        html = process(`\\begin{solutions}[Solutions to Section 1]\n\nSome solutions.\n\\end{solutions}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<solutions><title>Solutions to Section 1</title><p>Some solutions.</p></solutions>`)
        );
        html = process(`\\solutions{Chapter Solutions}\n\nSolution content.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<solutions><title>Chapter Solutions</title><p>Solution content.</p></solutions>`)
        );
    });
    it("converts \\begin{gi} glossary item", async () => {
        html = process(`\\begin{gi}\n\nA glossary term and definition.\n\\end{gi}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<gi><p>A glossary term and definition.</p></gi>`)
        );
    });
    it("converts \\begin{sbsgroup} and \\begin{stack}", async () => {
        html = process(`\\begin{sbsgroup}\n\nSide by side content.\n\\end{sbsgroup}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<sbsgroup><p>Side by side content.</p></sbsgroup>`)
        );
        html = process(`\\begin{stack}\n\nStacked content.\n\\end{stack}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<stack><p>Stacked content.</p></stack>`)
        );
    });
    it("converts \\begin{listing} named code container", async () => {
        html = process(`\\begin{listing}\\caption{My Code}\\begin{verbatim}\nx = 1\n\\end{verbatim}\\end{listing}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<listing><caption>My Code</caption><pre>\nx = 1\n</pre></listing>`)
        );
    });
});
