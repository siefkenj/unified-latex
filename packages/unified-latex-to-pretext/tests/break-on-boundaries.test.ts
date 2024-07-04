import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { breakOnBoundaries } from "../libs/pre-conversion-subs/break-on-boundaries";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:break-on-boundaries", () => {
    let value: string;

    it("can break on parts", () => {
        value = String.raw`\part{Foo}Hi, this is a part\part{Bar}This is another part`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({ messages: [] });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}[Foo]Hi, this is a part\end{_part}\begin{_part}[Bar]This is another part\end{_part}`
        );
    });

    it("can break on a combination of divisions", () => {
        value = String.raw`\part{part1}\section{Section1}Hi, this is a section\chapter{chap1}This is a chapter\section{Subsection2}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({ messages: [] });

        expect(printRaw(ast)).toEqual(
            "" +
                String.raw`\begin{_part}[part1]` +
                String.raw`\begin{_section}[Section1]Hi, this is a section\end{_section}` +
                String.raw`\begin{_chapter}[chap1]This is a chapter` +
                String.raw`\begin{_section}[Subsection2]\end{_section}\end{_chapter}\end{_part}`
        );
    });

    it("can break on divisions wrapped around by a document environment", () => {
        value = String.raw`\begin{document}\section{Baz}Hi, this is a subsection\subsubsection{Foo}description.\end{document}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({ messages: [] });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{document}\begin{_section}[Baz]Hi, this is a subsection` +
                String.raw`\begin{_subsubsection}[Foo]description.\end{_subsubsection}` +
                String.raw`\end{_section}\end{document}`
        );
    });

    it("can break on divisions wrapped around by different environments", () => {
        value =
            String.raw`\begin{center}\part{name}Hi, this is a part\begin{environ}` +
            String.raw`\subparagraph{title}description.\end{environ}\end{center}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({ messages: [] });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{center}\begin{_part}[name]Hi, this is a part` +
                String.raw`\begin{environ}\begin{_subparagraph}[title]description.` +
                String.raw`\end{_subparagraph}\end{environ}\end{_part}\end{center}`
        );
    });

    it("can break on divisions in a group", () => {
        value =
            String.raw`\begin{document}\chapter{Chap}` +
            String.raw`{\paragraph{Intro}Introduction.\begin{center}\subparagraph{Conclusion}Conclusion.\end{center}}` +
            String.raw`Chapter finished.\end{document}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({
            messages: [
                String.raw`Warning: hoisted out of a group, which might break the LaTeX code. ` +
                    String.raw`{ group: {\paragraph{Intro}Introduction.\begin{center}\subparagraph{Conclusion}Conclusion.\end{center}} }`,
            ],
        });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{document}\begin{_chapter}[Chap]\begin{_paragraph}[Intro]Introduction.` +
                String.raw`\begin{center}\begin{_subparagraph}[Conclusion]Conclusion.\end{_subparagraph}` +
                String.raw`\end{center}\end{_paragraph}Chapter finished.\end{_chapter}\end{document}`
        );
    });

    it("can break on divisions in nested groups", () => {
        value =
            String.raw`\part{part1}{\subsection{Intro}description.` +
            String.raw`\subsubsection{body}more text.{\subparagraph{Conclusion}Conclusion.}}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({
            messages: [
                String.raw`Warning: hoisted out of a group, which might break the LaTeX code. ` +
                    String.raw`{ group: {\subsection{Intro}description.\subsubsection{body}more text.{\subparagraph{Conclusion}Conclusion.}} }`,
                String.raw`Warning: hoisted out of a group, which might break the LaTeX code. ` +
                    String.raw`{ group: {\subparagraph{Conclusion}Conclusion.} }`, // ** Doesn't keep nested group
            ],
        });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}[part1]\begin{_subsection}[Intro]description.` +
                String.raw`\begin{_subsubsection}[body]more text.\begin{_subparagraph}[Conclusion]Conclusion.` +
                String.raw`\end{_subparagraph}\end{_subsubsection}\end{_subsection}\end{_part}`
        );
    });

    it("doesn't break on groups without a division as an immediate child", () => {
        value =
            String.raw`\part{part1}{not immediate\subsection{Intro}` +
            String.raw`\subsubsection{body}{$\mathbb{N}$\subparagraph{Conclusion}Conclusion.}}{\paragraph{immediate} words}`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({
            messages: [
                String.raw`Warning: hoisted out of a group, which might break the LaTeX code. ` +
                    String.raw`{ group: {\paragraph{immediate} words} }`,
            ],
        });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}[part1]{not immediate\begin{_subsection}[Intro]\begin{_subsubsection}[body]` +
                String.raw`{$\mathbb{N}$\begin{_subparagraph}[Conclusion]Conclusion.\end{_subparagraph}}` +
                String.raw`\end{_subsubsection}\end{_subsection}}\begin{_paragraph}[immediate] words\end{_paragraph}\end{_part}`
        );
    });

    it("can break on divisions with latex in their titles", () => {
        value = String.raw`\chapter{$x = \frac{1}{2}$}Chapter 1\subsection{\"name\_1\" \$}This is subsection`;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({ messages: [] });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_chapter}[$x = \frac{1}{2}$]Chapter 1` +
                String.raw`\begin{_subsection}[\"name\_1\" \$]This is subsection` +
                String.raw`\end{_subsection}\end{_chapter}`
        );
    });

    it("can break on divisions and trim whitespace around division beginnings and endings", () => {
        value = String.raw` \subsubsection{first}subsection 1  \paragraph{body}This is paragraph    `;

        const parser = getParser();
        const ast = parser.parse(value);

        expect(breakOnBoundaries(ast)).toEqual({ messages: [] });

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_subsubsection}[first]subsection 1 ` +
                String.raw`\begin{_paragraph}[body]This is paragraph` +
                String.raw`\end{_paragraph}\end{_subsubsection}`
        );
    });
});
