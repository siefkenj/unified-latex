import { describe, it, expect } from "vitest";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexToPretext } from "../libs/unified-latex-plugin-to-pretext";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";

/* eslint-env jest */

function convert(value: string, producePretextFragment: boolean) {
    const file = processLatexViaUnified()
        .use(unifiedLatexToPretext, { producePretextFragment })
        .use(xmlCompilePlugin)
        .processSync({ value });
    return {
        xml: String(file.value),
        messages: file.messages.map((m) => m.message),
    };
}

const fragment = (value: string) => convert(value, true).xml;
const document = (value: string) => convert(value, false).xml;

/** A beamer document around `body`, with `preamble` before `\begin{document}`. */
const beamer = (body: string, preamble = "") =>
    String.raw`\documentclass{beamer}` +
    `\n${preamble}\n` +
    String.raw`\begin{document}` +
    `\n${body}\n` +
    String.raw`\end{document}`;

describe("unified-latex-to-pretext:beamer pauses", () => {
    it("reveals the paragraph after a \\pause as its own step", () => {
        expect(
            fragment(String.raw`\begin{frame}{T}
One.

\pause
Two.
\end{frame}`)
        ).toEqual(
            `<slide><title>T</title><p>One.</p><p pause="yes">Two.</p></slide>`
        );
    });

    it("splits a paragraph at a \\pause in the middle of it", () => {
        expect(
            fragment(String.raw`\begin{frame}{T}One. \pause Two.\end{frame}`)
        ).toEqual(
            `<slide><title>T</title><p>One.</p><p pause="yes">Two.</p></slide>`
        );
    });

    it("wraps several blocks after a \\pause in a <subslide>", () => {
        const xml = fragment(String.raw`\begin{frame}{T}
Intro.
\pause
\begin{block}{B}Inside.\end{block}
\begin{theorem}Stated.\end{theorem}
\end{frame}`);
        expect(xml).toMatch(
            /<p>Intro\.<\/p><subslide><assemblage><title>B<\/title><p>Inside\.<\/p><\/assemblage>\s*<theorem>.*<\/theorem><\/subslide><\/slide>$/
        );
    });

    it("wraps a lone block that cannot take pause (a theorem) in a <subslide>", () => {
        const xml = fragment(String.raw`\begin{frame}{T}
Intro.
\pause
\begin{theorem}Stated.\end{theorem}
\end{frame}`);
        expect(xml).toContain("<subslide><theorem>");
    });

    it("puts pause on a paragraph holding a list, revealing the list at once", () => {
        const xml = fragment(String.raw`\begin{frame}{T}
Intro.

\pause
\begin{itemize}\item A\item B\end{itemize}
\end{frame}`);
        expect(xml).toContain(`<p pause="yes"><ul><li>`);
        expect(xml).not.toContain(`<ul pause`);
    });

    it("pauses an image", () => {
        const xml = fragment(String.raw`\begin{frame}{T}
Intro.
\pause
\includegraphics{later.png}
\end{frame}`);
        expect(xml).toContain(`<image pause="yes" source="later.png"`);
    });

    it("ignores a trailing \\pause", () => {
        const xml = fragment(String.raw`\begin{frame}{T}
One.
\pause
\end{frame}`);
        expect(xml).toEqual(`<slide><title>T</title><p>One.</p></slide>`);
    });

    it("reveals a list item by item for [<+->]", () => {
        expect(
            fragment(
                String.raw`\begin{itemize}[<+->]\item A\item B\end{itemize}`
            )
        ).toEqual(`<ul pause="yes"><li><p>A</p></li><li><p>B</p></li></ul>`);
    });

    it("reveals a list item by item for \\pause between items", () => {
        expect(
            fragment(
                String.raw`\begin{enumerate}\item A \pause\item B \pause\item C\end{enumerate}`
            )
        ).toEqual(
            `<ol pause="yes"><li><p>A</p></li><li><p>B</p></li><li><p>C</p></li></ol>`
        );
    });

    it("reveals a list item by item for \\item<+->", () => {
        expect(
            fragment(
                String.raw`\begin{itemize}\item<+-> A\item<+-> B\end{itemize}`
            )
        ).toContain(`<ul pause="yes">`);
    });

    it("drops other item overlays with a warning", () => {
        const { xml, messages } = convert(
            String.raw`\begin{itemize}\item<2> A\item<2> B\end{itemize}`,
            true
        );
        expect(xml).toEqual(`<ul><li><p>A</p></li><li><p>B</p></li></ul>`);
        expect(messages.join("\n")).toMatch(/one item at a time/);
    });

    it("reveals every list on a frame with an incremental default overlay", () => {
        const xml = fragment(String.raw`\begin{frame}[<+->]{T}
\begin{itemize}\item A\end{itemize}

\begin{enumerate}\item B\end{enumerate}
\end{frame}`);
        expect(xml).toContain(`<ul pause="yes">`);
        expect(xml).toContain(`<ol pause="yes">`);
    });

    it("does not treat a list label as an overlay", () => {
        expect(
            fragment(String.raw`\begin{enumerate}[a.-]\item A\end{enumerate}`)
        ).not.toContain("pause");
    });

    it("does not treat frame options as an overlay", () => {
        const xml = fragment(String.raw`\begin{frame}[fragile]{T}
\begin{itemize}\item A\end{itemize}
\end{frame}`);
        expect(xml).not.toContain("pause");
    });
});

describe("unified-latex-to-pretext:beamer frames", () => {
    it("converts the \\frame macro form in a beamer document", () => {
        const xml = document(
            beamer(String.raw`\frame{\frametitle{Macro} Frame body.}`)
        );
        expect(xml).toContain(
            `<slide><title>Macro</title><p>Frame body.</p></slide>`
        );
    });

    it("leaves \\frame alone outside a slideshow, where it draws a box", () => {
        const xml = document(
            String.raw`\documentclass{article}\begin{document}\frame{boxed}\end{document}`
        );
        expect(xml).not.toContain("<slide>");
        expect(xml).toContain("<article>");
    });

    it("drops an outline frame", () => {
        const { xml, messages } = convert(
            String.raw`\begin{frame}{Outline}\tableofcontents[currentsection]\end{frame}
\begin{frame}{Real}Content.\end{frame}`,
            true
        );
        expect(xml).toEqual(
            `<slide><title>Real</title><p>Content.</p></slide>`
        );
        expect(messages.join("\n")).toMatch(/outline or section page/);
    });

    it("gives an untitled frame an empty title, as the schema requires", () => {
        expect(fragment(String.raw`\begin{frame}Hi.\end{frame}`)).toEqual(
            `<slide><title /><p>Hi.</p></slide>`
        );
    });

    it("wraps slide text in <p> even when the deck has no blank lines", () => {
        expect(
            fragment(
                String.raw`\begin{frame}{A}One.\end{frame}\begin{frame}{B}Two.\end{frame}`
            )
        ).toEqual(
            `<slide><title>A</title><p>One.</p></slide><slide><title>B</title><p>Two.</p></slide>`
        );
    });

    it("keeps speaker notes as XML comments, not slide text", () => {
        const xml = fragment(
            String.raw`\begin{frame}{T}Visible. \note[item]{Say this.}\end{frame}`
        );
        expect(xml).toContain("<!-- note: Say this. -->");
        expect(xml).not.toMatch(/Say this\.(?! -->)/);
    });

    it("drops the overlay spec of overlay-aware text macros", () => {
        expect(
            fragment(String.raw`\alert<2>{a} \textbf<3>{b} \emph<1->{c}`)
        ).toEqual(`<alert>a</alert> <alert>b</alert> <em>c</em>`);
    });

    it("still reads a braced < as a text macro's argument", () => {
        expect(fragment(String.raw`\textbf{<} x`)).toEqual(
            `<alert>&#x3C;</alert> x`
        );
    });

    it("keeps the text of a size command", () => {
        expect(fragment(String.raw`{\Huge Questions?}`)).toEqual("Questions?");
    });
});

describe("unified-latex-to-pretext:beamer structure", () => {
    it("makes a beamer document a <slideshow>", () => {
        const xml = document(
            beamer(String.raw`\begin{frame}{A}One.\end{frame}`)
        );
        expect(xml).toMatch(/<pretext><slideshow><title \/><slide>/);
    });

    it("drops \\subsection, keeping its frames in the section", () => {
        const { xml, messages } = convert(
            beamer(String.raw`\section{S}
\subsection{Sub}
\begin{frame}{A}One.\end{frame}`),
            false
        );
        expect(xml).not.toContain("<subsection>");
        expect(xml).toContain(
            `<section><title>S</title><slide><title>A</title><p>One.</p></slide></section>`
        );
        expect(messages.join("\n")).toMatch(/no "\\subsection" level/);
    });

    it("turns \\appendix into an Appendix section when the deck has sections", () => {
        const xml = document(
            beamer(String.raw`\section{S}
\begin{frame}{A}One.\end{frame}
\appendix
\begin{frame}{Backup}Extra.\end{frame}`)
        );
        expect(xml).not.toContain("<appendix>");
        expect(xml).toContain(
            `<section><title>Appendix</title><slide><title>Backup</title>`
        );
    });

    it("keeps slides before the first section in order, with a warning", () => {
        const { xml, messages } = convert(
            beamer(String.raw`\begin{frame}{Outline}\tableofcontents\end{frame}
\begin{frame}{Motivation}Why.\end{frame}
\section{S}
\begin{frame}{A}One.\end{frame}`),
            false
        );
        expect(xml).toContain(
            `<slide><title>Motivation</title><p>Why.</p></slide><section><title>S</title>`
        );
        expect(messages.join("\n")).toMatch(/outside any section/);
    });

    it("does not warn when only a dropped outline frame precedes the sections", () => {
        const { messages } = convert(
            beamer(String.raw`\begin{frame}{Outline}\tableofcontents\end{frame}
\section{S}
\begin{frame}{A}One.\end{frame}`),
            false
        );
        expect(messages.join("\n")).not.toMatch(/outside any section/);
    });

    it("drops \\appendix in a deck without sections", () => {
        const xml = document(
            beamer(String.raw`\begin{frame}{A}One.\end{frame}
\appendix
\begin{frame}{Backup}Extra.\end{frame}`)
        );
        expect(xml).not.toContain("<appendix>");
        expect(xml).not.toContain("<section>");
        expect(xml).toContain(`<slide><title>Backup</title>`);
    });
});

describe("unified-latex-to-pretext:beamer title page", () => {
    const preamble = String.raw`\title[Short]{Graph Theory}
\subtitle{A first look}
\author{Ada Lovelace\inst{1} \and Alan Turing\inst{2}\thanks{Funding.}}
\institute{\inst{1}Univ.\ One \and \inst{2}Dept.\\ Univ.\ Two}
\date{May 2026}`;

    it("builds the title, subtitle, short title, and frontmatter from the preamble", () => {
        const xml = document(
            beamer(
                String.raw`\begin{frame}\titlepage\end{frame}
\begin{frame}{A}One.\end{frame}`,
                preamble
            )
        );
        expect(xml).toContain(
            `<slideshow><title>Graph Theory</title><subtitle>A first look</subtitle><shorttitle>Short</shorttitle><frontmatter><bibinfo>`
        );
        expect(xml).toContain(
            `<author><personname>Ada Lovelace</personname><institution>Univ. One</institution></author>`
        );
        expect(xml).toContain(
            `<author><personname>Alan Turing</personname><institution><line>Dept.</line><line>Univ. Two</line></institution></author>`
        );
        expect(xml).toContain(`<date>May 2026</date>`);
        expect(xml).toContain(
            `</bibinfo><titlepage><titlepage-items /></titlepage></frontmatter><slide><title>A</title>`
        );
        expect(xml).not.toContain("titlepage}");
        expect(xml).not.toContain("Funding");
    });

    it("moves the rest of the title frame, and the title graphic, to a slide after the title slide", () => {
        const { xml, messages } = convert(
            beamer(
                String.raw`\begin{frame}
\titlepage
Joint work with a friend.
\end{frame}
\begin{frame}{A}One.\end{frame}`,
                preamble +
                    "\n" +
                    String.raw`\titlegraphic{\includegraphics{logo.png}}`
            ),
            false
        );
        expect(xml).toMatch(
            /<\/frontmatter><slide><title \/><p>\s*Joint work with a friend\.\s*<\/p><image source="logo.png" \/><\/slide><slide><title>A<\/title>/
        );
        expect(messages.join("\n")).toMatch(/moved to a slide of its own/);
    });

    it("handles \\frame{\\titlepage} and \\maketitle", () => {
        for (const titleFrame of [
            String.raw`\frame{\titlepage}`,
            String.raw`\begin{frame}\maketitle\end{frame}`,
        ]) {
            const xml = document(
                beamer(
                    `${titleFrame}\n` +
                        String.raw`\begin{frame}{A}One.\end{frame}`,
                    preamble
                )
            );
            expect(xml).toContain(`</frontmatter><slide><title>A</title>`);
        }
    });

    it("gives a title frame a frontmatter even with no author or date", () => {
        const xml = document(
            beamer(
                String.raw`\begin{frame}\titlepage\end{frame}
\begin{frame}{A}One.\end{frame}`,
                String.raw`\title{Bare}`
            )
        );
        expect(xml).toContain(
            `<slideshow><title>Bare</title><frontmatter><bibinfo /><titlepage><titlepage-items /></titlepage></frontmatter>`
        );
    });

    it("applies a lone institute to every author", () => {
        const xml = document(
            beamer(
                String.raw`\begin{frame}{A}One.\end{frame}`,
                String.raw`\author{A \and B}\institute{Shared U}`
            )
        );
        expect(xml).toContain(
            `<author><personname>A</personname><institution>Shared U</institution></author><author><personname>B</personname><institution>Shared U</institution></author>`
        );
    });
});

describe("unified-latex-to-pretext:document metadata", () => {
    it("reads the title and authors of an article from its preamble", () => {
        const xml = document(String.raw`\documentclass{article}
\title{An Article}
\author{A \and B}
\begin{document}
Hello.
\end{document}`);
        expect(xml).toContain(
            `<article><title>An Article</title><frontmatter><bibinfo><author><personname>A</personname></author><author><personname>B</personname></author></bibinfo>`
        );
    });

    it("makes a book of \\documentclass{book} even before any chapter", () => {
        const xml = document(String.raw`\documentclass{book}
\begin{document}
Hello.
\end{document}`);
        expect(xml).toContain("<book>");
    });
});
