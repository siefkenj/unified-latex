import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { breakOnBoundaries } from "../libs/break-on-boundaries";

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

        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}\title{Foo}Hi, this is a part\end{_part}\begin{_part}\title{Bar}This is another part\end{_part}`
        );
    });

    it("can break on a combination of divisions", () => {
        value = String.raw`\part{part1}\section{Section1}Hi, this is a section\chapter{chap1}This is a chapter\section{Subsection2}`;

        const parser = getParser();
        const ast = parser.parse(value);

        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}\title{part1}` +
                String.raw`\begin{_section}\title{Section1}Hi, this is a section\end{_section}` +
                String.raw`\begin{_chapter}\title{chap1}This is a chapter` +
                String.raw`\begin{_section}\title{Subsection2}\end{_section}\end{_chapter}\end{_part}`
        );
    });

    it("can break on divisions wrapped around by a document environment", () => {
        value = String.raw`\begin{document}\section{name}Hi, this is a subsection\subsubsection{title}description.\end{document}`;

        const parser = getParser();
        const ast = parser.parse(value);

        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{document}\begin{_section}\title{name}Hi, this is a subsection` +
                String.raw`\begin{_subsubsection}\title{title}description.\end{_subsubsection}` +
                String.raw`\end{_section}\end{document}`
        );
    });

    it("can break on divisions wrapped around by different environments", () => {
        value =
            String.raw`\begin{center}\part{name}Hi, this is a part\begin{environ}` +
            String.raw`\subparagraph{title}description.\end{environ}\end{center}`;

        const parser = getParser();
        const ast = parser.parse(value);

        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{center}\begin{_part}\title{name}Hi, this is a part` +
                String.raw`\begin{environ}\begin{_subparagraph}\title{title}description.` +
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

        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{document}\begin{_chapter}\title{Chap}{\begin{_paragraph}\title{Intro}Introduction.` +
                String.raw`\begin{center}\begin{_subparagraph}\title{Conclusion}Conclusion.\end{_subparagraph}` +
                String.raw`\end{center}\end{_paragraph}}Chapter finished.\end{_chapter}\end{document}`
        );
    });
});
