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

    it("Comments are preserved as XML comments", async () => {
        // A comment absorbs surrounding whitespace; a space is re-emitted
        // when the LaTeX source would have rendered one.
        html = process(`a % foo\nb`);
        expect(html).toEqual(`a <!-- foo-->b`);

        html = process(`a% foo\nb`);
        expect(html).toEqual(`a<!-- foo-->b`);

        // An own-line comment's line break acts as a space
        html = process(`a\n% foo\nb`);
        expect(html).toEqual(`a <!-- foo-->b`);

        html = process(`a% foo\n\nb`);
        expect(html).toEqual(`<p>a<!-- foo--></p><p>b</p>`);

        // A comment alone between paragraphs is not wrapped in a <p>
        html = process(`a\n\n% foo\n\nb`);
        expect(html).toEqual(`<p>a</p> <!-- foo--><p>b</p>`);
    });

    it("A dropped macro alone between paragraphs does not leave a self-closing <p>", async () => {
        // `\centering` has no PreTeXt equivalent and is dropped (see
        // dropped-subs.ts), but that only happens *after* pars are split
        // into <p> tags, so a paragraph consisting only of `\centering`
        // would otherwise be left wrapping nothing.
        html = process(`a\n\n\\centering\n\nb`);
        expect(html).toEqual(`<p>a</p><p>b</p>`);
    });

    it("Comments inside math are removed", async () => {
        html = process(`\\[x %comment\n+ y\\]`);
        expect(html).toEqual(`<md>x+ y</md>`);
    });

    // PreTeXt's `<md>` has two content models: single-line (text content,
    // rendered as `\begin{equation}`) and multi-line (`<mrow>` children, with
    // `@alignment` naming the amsmath environment). Emitting the single-line
    // form for a multi-line environment is silently wrong at conversion time
    // and a LaTeX/MathJax error at build time.
    describe("display math", () => {
        it("Multi-line environments produce <mrow> children", () => {
            expect(process(String.raw`\begin{align} a &= b \\ c &= d \end{align}`)).toEqual(
                `<md alignment="align" number="yes"><mrow>a&#x26;= b</mrow><mrow>c&#x26;= d</mrow></md>`
            );
            expect(process(String.raw`\begin{gather} a \\ b \end{gather}`)).toEqual(
                `<md alignment="gather" number="yes"><mrow>a</mrow><mrow>b</mrow></md>`
            );
            // PreTeXt has no `multline`; `gather` keeps the author's line breaks.
            expect(process(String.raw`\begin{multline} a + b \\ + c \end{multline}`)).toEqual(
                `<md alignment="gather" number="yes"><mrow>a + b</mrow><mrow>+ c</mrow></md>`
            );
        });

        it("Starred environments are unnumbered", () => {
            expect(process(String.raw`\begin{align*} a &= b \end{align*}`)).toEqual(
                `<md alignment="align"><mrow>a&#x26;= b</mrow></md>`
            );
            expect(process(String.raw`\begin{equation*} a = b \end{equation*}`)).toEqual(
                `<md>a = b</md>`
            );
        });

        it("Single-line environments keep the single-line content model", () => {
            expect(process(String.raw`\begin{equation} a = b \end{equation}`)).toEqual(
                `<md number="yes">a = b</md>`
            );
            expect(process(String.raw`\[ a = b \]`)).toEqual(`<md>a = b</md>`);
            // A nested `split` is legal inside PreTeXt's `\begin{equation}`, so
            // it stays verbatim rather than being unwrapped into mrows.
            expect(
                process(String.raw`\begin{equation}\begin{split} a &= b \\ &= c \end{split}\end{equation}`)
            ).toEqual(
                `<md number="yes">\\begin{split}a&#x26;= b \\\\&#x26;= c\\end{split}</md>`
            );
        });

        it("A `\\\\` promotes a single-line environment to mrows", () => {
            // No @alignment: the author never named one, so PreTeXt sniffs.
            expect(process(String.raw`\[ a \\ b \]`)).toEqual(
                `<md><mrow>a</mrow><mrow>b</mrow></md>`
            );
        });

        it("`\\label` becomes a cross-reference target on the right node", () => {
            // Single-line: the label targets the whole display.
            expect(
                process(String.raw`\begin{equation}\label{eq:x} a = b \end{equation}`)
            ).toEqual(`<md xml:id="eq-x" number="yes">a = b</md>`);
            // Multi-line: the label targets its own row, and `\nonumber`
            // suppresses the number on its own row only.
            expect(
                process(String.raw`\begin{align} a &= b \nonumber \\ c &= d \label{eq:y} \end{align}`)
            ).toEqual(
                `<md alignment="align" number="yes">` +
                    `<mrow number="no">a&#x26;= b</mrow>` +
                    `<mrow xml:id="eq-y">c&#x26;= d</mrow></md>`
            );
        });

        it("`\\eqref` resolves against the label it points at", () => {
            expect(
                process(String.raw`\eqref{eq:x} \begin{equation}\label{eq:x} a = b \end{equation}`)
            ).toEqual(`<xref ref="eq-x" /> <md xml:id="eq-x" number="yes">a = b</md>`);
        });

        it("`\\intertext` becomes a sibling of the surrounding rows", () => {
            expect(
                process(String.raw`\begin{align} a &= b \\ \intertext{and then} c &= d \end{align}`)
            ).toEqual(
                `<md alignment="align" number="yes">` +
                    `<mrow>a&#x26;= b</mrow>` +
                    `<intertext>and then</intertext>` +
                    `<mrow>c&#x26;= d</mrow></md>`
            );
        });

        it("Rows split only on top-level `\\\\`", () => {
            // The `\\` inside `cases` belongs to that environment's own content,
            // so the AST already hides it from the row splitter.
            expect(
                process(String.raw`\begin{gather} \begin{cases} x \\ y \end{cases} \\ z \end{gather}`)
            ).toEqual(
                `<md alignment="gather" number="yes">` +
                    `<mrow>\\begin{cases}x \\\\ y\\end{cases}</mrow>` +
                    `<mrow>z</mrow></md>`
            );
            // A trailing `\\` does not mean one more, empty, row; and PreTeXt
            // has no per-row spacing, so `[10pt]` is dropped.
            expect(
                process(String.raw`\begin{align} a &= b \\[10pt] c &= d \\ \end{align}`)
            ).toEqual(
                `<md alignment="align" number="yes"><mrow>a&#x26;= b</mrow><mrow>c&#x26;= d</mrow></md>`
            );
        });

        // These two are mis-typed as text-mode environments by the parser; see
        // `normalizeMathEnvironments` in pre-conversion-subs/math-env-subs.ts.
        it("`alignat` and `eqnarray` are recognized as display math", () => {
            expect(process(String.raw`\begin{alignat}{2} a &= b & c &= d \end{alignat}`)).toEqual(
                `<md alignment="alignat" alignat-columns="2" number="yes">` +
                    `<mrow>a &#x26;= b &#x26; c &#x26;= d</mrow></md>`
            );
            expect(process(String.raw`\begin{alignat*}{3} a &= b \end{alignat*}`)).toEqual(
                `<md alignment="alignat" alignat-columns="3"><mrow>a &#x26;= b</mrow></md>`
            );
            expect(process(String.raw`\begin{eqnarray} a &=& b \end{eqnarray}`)).toEqual(
                `<md alignment="align" number="yes"><mrow>a &#x26;=&#x26; b</mrow></md>`
            );
            // The star must survive: `eqnarray` has no renderInfo marking it as
            // math, so `stripStarredEnvironments` would otherwise eat it.
            expect(process(String.raw`\begin{eqnarray*} a &=& b \end{eqnarray*}`)).toEqual(
                `<md alignment="align"><mrow>a &#x26;=&#x26; b</mrow></md>`
            );
        });
    });

    it("Handles URLs", async () => {
        html = process(`a\\url{foo.com}b`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a<url href="foo.com"/>b`)
        );

        html = process(`a\\href{foo.com}{FOO}b`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`a<url href="foo.com">FOO</url>b`)
        );
    });

    it("Preserves punctuation in URLs", async () => {
        html = process(`See \\url{https://example.com/a/b?x=1&y=2#frag}.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `See <url href="https://example.com/a/b?x=1&#x26;y=2#frag"/>.`
            )
        );

        html = process(`See \\href{https://example.com/page}{here}.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `See <url href="https://example.com/page">here</url>.`
            )
        );
    });

    it("Does not apply ligature replacement inside URLs", async () => {
        // `~`, `--` and `---` are ordinary URL characters, not prose ligatures.
        html = process(`\\url{https://example.com/~user/a--b/c---d}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<url href="https://example.com/~user/a--b/c---d"/>`
            )
        );

        // ...but a \href's link text is prose, so it still gets them.
        html = process(`\\href{https://ex.com/~u/a--b}{Smith--Jones}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<url href="https://ex.com/~u/a--b">Smith<ndash/>Jones</url>`
            )
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
            await normalizeHtml(
                `<p>a b</p><TODO type="unknown-environment"><!--todo: unknown environment "foo"--><pre>\\begin{foo}x\\end{foo}</pre></TODO><p>c</p><p>d</p>`
            )
        );
    });

    it("Unknown environments are preserved in a <TODO> placeholder", async () => {
        html = process(`\\begin{fancybox}Some \\emph{content}\\end{fancybox}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<TODO type="unknown-environment"><!--todo: unknown environment "fancybox"--><pre>\\begin{fancybox}Some \\emph{content}\\end{fancybox}</pre></TODO>`
            )
        );
    });

    it("Unknown macros are preserved in a <TODO> placeholder", async () => {
        html = process(`a \\fancymacro b`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `a <TODO type="unknown-macro"><!--todo: unknown macro "\\fancymacro"--><c>\\fancymacro</c></TODO> b`
            )
        );
    });

    it("Macros aren't replaced with html code in math mode", async () => {
        let ast;

        // Custom labels are handled. The `\\` splits the display into two
        // `<mrow>`s (see display-math.ts) but its content is left verbatim.
        ast = process(`\\[a\\\\b\\]`);
        expect(await normalizeHtml(ast)).toEqual(
            await normalizeHtml(`<md><mrow>a</mrow><mrow>b</mrow></md>`)
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
            await normalizeHtml(
                `<p>x</p><p>y<md><mrow>a</mrow><mrow>b</mrow></md>z</p>`
            )
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

        ast = process(`\\paragraphs{Important.} Paragraph`);
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
    it("silently drops a trailing \\vfill in a block environment outside a worksheet/handout/project-like context", async () => {
        html = process(`\\begin{dfn}\na\\vfill\n\\end{dfn}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<definition><statement><p>a</p></statement></definition>`
            )
        );
    });
    it("silently drops a trailing \\vspace in a block environment outside a worksheet/handout/project-like context", async () => {
        html = process(`\\begin{dfn}\na\\vspace{2cm}\n\\end{dfn}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<definition><statement><p>a</p></statement></definition>`
            )
        );
    });
    it("converts a trailing \\vfill into a workspace attribute inside a worksheet environment", async () => {
        html = process(`\\begin{worksheet}\na\\vfill\n\\end{worksheet}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<worksheet workspace="1in"><p>a</p></worksheet>`)
        );
    });
    it("converts a trailing \\vspace into a workspace attribute inside a block environment nested in a handout", async () => {
        html = process(
            `\\begin{handout}\\begin{dfn}\na\\vspace{2cm}\n\\end{dfn}\\end{handout}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<handout><definition workspace="2cm"><statement><p>a</p></statement></definition></handout>`
            )
        );
    });
    it("converts a trailing \\vfill into a workspace attribute inside a project-like environment", async () => {
        html = process(`\\begin{activity}\na\\vfill\n\\end{activity}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<activity workspace="1in"><p>a</p></activity>`)
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
    it("ignores the star on starred environments and converts them like the unstarred form", async () => {
        html = process(`\\begin{theorem*}a\\end{theorem*}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<theorem><statement><p>a</p></statement></theorem>`
            )
        );

        html = process(`\\begin{quote*}a\\end{quote*}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<blockquote><p>a</p></blockquote>`)
        );

        // A starred PreTeXt-specific environment still picks up its optional title.
        html = process(`\\begin{exercises*}[My Title]a\\end{exercises*}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<exercises><title>My Title</title><p>a</p></exercises>`)
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
    it("Falls back to <biblio type=\"raw\"> for unstructured entries", async () => {
        // No emphasized title and no \newblock, so there is nothing to
        // recover; the raw form is still valid and still anchors \cite.
        // The optional [label] is dropped -- PreTeXt labels entries itself.
        html = process(
            `\\begin{thebibliography}{99}\n\\bibitem[Jon19]{jones2019} A. Jones, Another Paper, 2019.\n\\end{thebibliography}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<references><biblio xml:id="jones2019" type="raw">A. Jones, Another Paper, 2019.</biblio></references>`
            )
        );
    });

    it("Parses AMS-style \\bibitem entries into CSL fields", async () => {
        html = process(
            `\\begin{thebibliography}{99}\n\\bibitem{conrey} J.~B. Conrey and D.~W. Farmer, \\emph{Mean values of $L$-functions and symmetry}, Internat. Math. Res. Notices (2000), no.~17, 883--908.\n\\end{thebibliography}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<references><biblio xml:id="conrey" type="article-journal"><author><name><given>J. B.</given><family>Conrey</family></name><name><given>D. W.</given><family>Farmer</family></name></author><title>Mean values of <m>L</m>-functions and symmetry</title><container-title>Internat. Math. Res. Notices</container-title><number>17</number><issued><date year="2000"/></issued><page>883-908</page></biblio></references>`
            )
        );
    });

    it("Parses \\newblock-style (plain.bst) entries into the same CSL fields", async () => {
        // plain/abbrv/alpha separate fields with \newblock and italicize the
        // *journal*, where AMS styles italicize the *title*.
        html = process(
            `\\begin{thebibliography}{99}\n\\bibitem{conrey} J.~B. Conrey and D.~W. Farmer. \\newblock Mean values of {$L$}-functions and symmetry. \\newblock {\\em Internat. Math. Res. Notices}, (17):883--908, 2000.\n\\end{thebibliography}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<references><biblio xml:id="conrey" type="article-journal"><author><name><given>J. B.</given><family>Conrey</family></name><name><given>D. W.</given><family>Farmer</family></name></author><title>Mean values of <m>L</m>-functions and symmetry</title><container-title>Internat. Math. Res. Notices</container-title><number>17</number><issued><date year="2000"/></issued><page>883-908</page></biblio></references>`
            )
        );
    });

    it("Classifies an entry with a publisher as a CSL book", async () => {
        html = process(
            `\\begin{thebibliography}{99}\n\\bibitem{lang} S. Lang, \\emph{Algebra}, 3rd ed., Springer-Verlag, New York, 2002.\n\\end{thebibliography}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<references><biblio xml:id="lang" type="book"><author><name><given>S.</given><family>Lang</family></name></author><title>Algebra</title><edition>3</edition><issued><date year="2002"/></issued><publisher>Springer-Verlag</publisher><publisher-place>New York</publisher-place></biblio></references>`
            )
        );
    });

    it("Keeps a \\url intact in a CSL entry and classifies it as a webpage", async () => {
        // The URL must not go through ligature expansion: `~` would become a
        // Unicode nbsp (which `\s` then matches, truncating the link).
        html = process(
            `\\begin{thebibliography}{99}\n\\bibitem{web} A. Author, \\emph{Some page}, 2021. \\url{https://example.com/~user/a--b}\n\\end{thebibliography}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<references><biblio xml:id="web" type="webpage"><author><name><given>A.</given><family>Author</family></name></author><title>Some page</title><issued><date year="2021"/></issued><URL>https://example.com/~user/a--b</URL></biblio></references>`
            )
        );
    });

    it("Handles \\bysame, accents, name particles, and a bold volume", async () => {
        html = process(
            `\\begin{thebibliography}{99}\n\\bibitem{a} P. Erd{\\H o}s and B.~L. van der Waerden, \\emph{First paper}, J. Things \\textbf{12} (1998), 1--10.\n\\bibitem{b} \\bysame, \\emph{Second paper}, J. Things \\textbf{13} (1999), 11--20.\n\\end{thebibliography}`
        );
        const authors = `<author><name><given>P.</given><family>Erdős</family></name><name><given>B. L.</given><non-dropping-particle>van der</non-dropping-particle><family>Waerden</family></name></author>`;
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<references>` +
                    `<biblio xml:id="a" type="article-journal">${authors}<title>First paper</title><container-title>J. Things</container-title><volume>12</volume><issued><date year="1998"/></issued><page>1-10</page></biblio>` +
                    `<biblio xml:id="b" type="article-journal">${authors}<title>Second paper</title><container-title>J. Things</container-title><volume>13</volume><issued><date year="1999"/></issued><page>11-20</page></biblio>` +
                    `</references>`
            )
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
    it("silently drops a trailing \\vspace at the end of a section (not workspace-eligible)", async () => {
        html = process(`\\section{Sec}\n\nSome text.\\vspace{1in}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section><title>Sec</title>Some text.</section>`
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
        html = process(`inline \\verb|x^2 ~: -- a| code`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`inline <c>x^2 ~: -- a</c> code`)
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
    it("silently drops a trailing \\vspace inside a macro argument (not workspace-eligible)", async () => {
        expect(
            await normalizeHtml(process(`\\footnote{a note\\vspace{1in}}`))
        ).toEqual(await normalizeHtml(`<fn>a note</fn>`));
    });
    it("converts a trailing \\vspace inside a macro argument into a workspace attribute when nested in a worksheet", async () => {
        expect(
            await normalizeHtml(
                process(
                    `\\begin{worksheet}\\footnote{a note\\vspace{1in}}\\end{worksheet}`
                )
            )
        ).toEqual(
            await normalizeHtml(
                `<worksheet><p><fn workspace="1in">a note</fn></p></worksheet>`
            )
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
    it("converts \\handout{title} macro to <handout>", async () => {
        html = process(`\\handout{Class Handout}\n\nRead this before class.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<handout><title>Class Handout</title><p>Read this before class.</p></handout>`)
        );
    });
    it("converts \\begin{handout} environment to <handout>", async () => {
        html = process(`\\begin{handout}[Class Handout]\n\nRead this before class.\n\\end{handout}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<handout><title>Class Handout</title><p>Read this before class.</p></handout>`)
        );
    });
    it("converts \\subsection[worksheet]{title} to a <worksheet> nested inside the enclosing <section>", async () => {
        html = process(
            `\\section{Sec}\n\nIntro.\n\n\\subsection[worksheet]{Lab 1}\n\nDo problems 1-5.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section><title>Sec</title><p>Intro.</p><worksheet><title>Lab 1</title><p>Do problems 1-5.</p></worksheet></section>`
            )
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
    it("converts \\handout{title} macro to <handout>", async () => {
        html = process(`\\handout{Class Handout}\n\nRead this before class.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<handout><title>Class Handout</title><p>Read this before class.</p></handout>`)
        );
    });
    it("converts \\begin{handout} environment to <handout>", async () => {
        html = process(`\\begin{handout}[Class Handout]\n\nRead this before class.\n\\end{handout}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<handout><title>Class Handout</title><p>Read this before class.</p></handout>`)
        );
    });
    it("converts \\subsection[worksheet]{title} to a <worksheet> nested inside the enclosing <section>", async () => {
        html = process(
            `\\section{Sec}\n\nIntro.\n\n\\subsection[worksheet]{Lab 1}\n\nDo problems 1-5.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section><title>Sec</title><p>Intro.</p><worksheet><title>Lab 1</title><p>Do problems 1-5.</p></worksheet></section>`
            )
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

describe("unified-latex-to-pretext:document-root macros", () => {
    // Unlike `process` above, this produces a full document (no
    // `producePretextFragment`), so \book/\article/\slideshow can pick the
    // wrapping tag themselves instead of relying on \documentclass.
    const processDoc = (value: string) =>
        (
            processLatexViaUnified({})
                .use(unifiedLatexToPretext, {})
                .use(xmlCompilePlugin)
                .processSync({ value }).value as string
        ).replace(/^<\?xml[^?]*\?>/, "");

    it("wraps a document starting with \\article{Title} in <article>", async () => {
        const html = processDoc(
            `\\begin{document}\\article{My Title}\\section{Sec}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><article><title>My Title</title><section><title>Sec</title>Hi.</section></article></pretext>`
            )
        );
    });

    it("wraps a document starting with \\book{Title} in <book>", async () => {
        const html = processDoc(
            `\\begin{document}\\book{My Book}\\chapter{Chap}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><book><title>My Book</title><chapter><title>Chap</title>Hi.</chapter></book></pretext>`
            )
        );
    });

    it("wraps a document starting with \\slideshow{Title} in <slideshow>", async () => {
        const html = processDoc(
            `\\begin{document}\\slideshow{My Slides}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><slideshow><title>My Slides</title>Hi.</slideshow></pretext>`
            )
        );
    });

    it("still falls back to the \\documentclass heuristic when no document-root macro is present", async () => {
        const html = processDoc(
            `\\documentclass{book}\\begin{document}\\chapter{Chap}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><book><title/><chapter><title>Chap</title>Hi.</chapter></book></pretext>`
            )
        );
    });

    it("builds <frontmatter><bibinfo> from preamble \\author/\\address/\\email, after a \\book/\\article root macro", async () => {
        const html = processDoc(
            `\\author{Jane Doe}\\address{State University}\\email{jane@example.edu}` +
                `\\begin{document}\\article{My Title}\\section{Sec}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><article><title>My Title</title>` +
                    `<frontmatter><bibinfo><author><personname>Jane Doe</personname>` +
                    `<institution>State University</institution><email>jane@example.edu</email>` +
                    `</author></bibinfo><titlepage><titlepage-items/></titlepage></frontmatter>` +
                    `<section><title>Sec</title>Hi.</section></article></pretext>`
            )
        );
    });

    it("builds <frontmatter><bibinfo> with multiple authors, \\date, and \\keywords, after the \\documentclass fallback", async () => {
        const html = processDoc(
            `\\documentclass{book}\\begin{document}` +
                `\\author{A}\\author{B}\\date{2026}\\keywords{graph theory, combinatorics}` +
                `\\chapter{Chap}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><book><title/>` +
                    `<frontmatter><bibinfo>` +
                    `<author><personname>A</personname></author>` +
                    `<author><personname>B</personname></author>` +
                    `<date>2026</date>` +
                    `<keywords><keyword>graph theory</keyword><keyword>combinatorics</keyword></keywords>` +
                    `</bibinfo><titlepage><titlepage-items/></titlepage></frontmatter>` +
                    `<chapter><title>Chap</title>Hi.</chapter></book></pretext>`
            )
        );
    });

    it("maps \\subjclass to a <keywords authority=\"msc\"> block", async () => {
        const html = processDoc(
            `\\author{Jane}\\subjclass[2020]{05C99, 68W99}` +
                `\\begin{document}\\article{T}Hi.\\end{document}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<pretext><article><title>T</title>` +
                    `<frontmatter><bibinfo>` +
                    `<author><personname>Jane</personname></author>` +
                    `<keywords authority="msc" variant="2020"><keyword>05C99</keyword><keyword>68W99</keyword></keywords>` +
                    `</bibinfo><titlepage><titlepage-items/></titlepage></frontmatter>` +
                    `Hi.</article></pretext>`
            )
        );
    });
});

describe("unified-latex-to-pretext:beamer", () => {
    const process = (value: string) =>
        processLatexViaUnified()
            .use(unifiedLatexToPretext, { producePretextFragment: true })
            .use(xmlCompilePlugin)
            .processSync({ value }).value as string;

    it("converts a frame to a slide with the \\frametitle as a sibling <title> (a lone paragraph is not wrapped in <p>, like a division)", async () => {
        const html = process(
            `\\begin{frame}\\frametitle{My Title}\nSome content.\n\\end{frame}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<slide><title>My Title</title>Some content.</slide>`
            )
        );
    });

    it("uses a braced frame title \\begin{frame}{Title}{Subtitle}", async () => {
        const html = process(
            `\\begin{frame}{Braced Title}{Braced Sub}\nBody.\n\\end{frame}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<slide><title>Braced Title</title><subtitle>Braced Sub</subtitle>Body.</slide>`
            )
        );
    });

    it("keeps the title outside multiple paragraphs and converts \\framesubtitle", async () => {
        const html = process(
            `\\begin{frame}\\frametitle{T}\\framesubtitle{S}\nOne.\n\nTwo.\n\\end{frame}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<slide><title>T</title><subtitle>S</subtitle><p>One.</p><p>Two.</p></slide>`
            )
        );
    });

    it("wraps a slide's paragraphs like a division: block-level children stay out of <p>, lists stay in", () => {
        // NB: raw string compare — `<p><ul>` is valid PreTeXt but not valid HTML,
        // so prettier's HTML parser (used by normalizeHtml) rejects it.
        const html = process(
            `\\begin{frame}\\frametitle{T}\nIntro.\n\n\\begin{itemize}\\item A\\end{itemize}\n\n\\begin{block}{B}Inside.\\end{block}\\end{frame}`
        );
        expect(html).toEqual(
            `<slide><title>T</title><p>Intro.</p><p><ul><li><p>A</p></li></ul></p><assemblage><title>B</title><p>Inside.</p></assemblage></slide>`
        );
    });

    it("wraps slide paragraphs by the same rules as a <section>", () => {
        const body = `Intro.\n\n\\begin{itemize}\\item A\\end{itemize}\n\nOutro.`;
        const slide = process(`\\begin{frame}\\frametitle{T}\n${body}\\end{frame}`);
        const section = process(`\\section{T}${body}`);
        // Same paragraph-wrapping structure, only the outer tag differs.
        expect(slide).toEqual(
            section
                .replace(/^<section>/, "<slide>")
                .replace(/<\/section>$/, "</slide>")
        );
    });

    it("treats the `slide` environment as a synonym for `frame`", () => {
        // `slide` shares beamerFrameFactory with `frame`, but the pre-pass that
        // wraps a slide's body in <p> (isSlideEnviron) has to know about the
        // synonym separately, since it runs before environmentReplacements.
        const html = process(
            `\\begin{slide}\\frametitle{T}\nIntro.\n\n\\begin{itemize}\\item A\\end{itemize}\n\nOutro.\\end{slide}`
        );
        expect(html).toEqual(
            `<slide><title>T</title><p>Intro.</p><p><ul><li><p>A</p></li></ul></p><p>Outro.</p></slide>`
        );
    });

    it("converts block/alertblock/exampleblock to <assemblage> with a <title>", async () => {
        const html = process(
            `\\begin{block}{Key Idea}\nText.\n\\end{block}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<assemblage><title>Key Idea</title><p>Text.</p></assemblage>`
            )
        );
    });

    it("converts columns/column to <sidebyside>/<stack>", async () => {
        const html = process(
            `\\begin{columns}\\begin{column}{0.5\\textwidth}Left\\end{column}\\begin{column}{0.5\\textwidth}Right\\end{column}\\end{columns}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<sidebyside><stack><p>Left</p></stack><stack><p>Right</p></stack></sidebyside>`
            )
        );
    });

    it("drops \\pause and keeps surrounding content", async () => {
        const html = process(`A\\pause B`);
        expect(await normalizeHtml(html)).toEqual(await normalizeHtml(`A B`));
    });

    it("drops \\only overlay spec but keeps (and converts) its content", async () => {
        const html = process(`\\only<2>{Shown \\textbf{bold}}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`Shown <alert>bold</alert>`)
        );
    });

    it("does not crash on overlay specs attached to \\item", async () => {
        const html = process(
            `\\begin{itemize}\\item<1-> One\\item<2-> Two\\end{itemize}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<ul><li><p>One</p></li><li><p>Two</p></li></ul>`
            )
        );
    });

    it("converts \\begin{tikzpicture} correctly", async () => {
        const html = process(
            `\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<image><latex-image>\n\\draw (0,0) -- (1,1);\n</latex-image></image>`)
        );
    });
});
