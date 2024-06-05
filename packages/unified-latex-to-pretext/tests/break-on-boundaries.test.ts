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

        // break-on-boundaries work done here
        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}\title{Foo}Hi, this is a part\end{_part}\begin{_part}\title{Bar}This is another part\end{_part}`
        );
    });

    it("can break on a section", () => {
        value = String.raw`\section{name}Hi, this is a subsection`;

        const parser = getParser();
        const ast = parser.parse(value);

        // break-on-boundaries work done here
        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_section}\title{name}Hi, this is a subsection\end{_section}`
        );
    });
    it("can break on combination of divisions", () => {
        value = String.raw`\part{part1}\section{Section1}Hi, this is a section\chapter{chap1}This is a chapter\section{Subsection2}`;

        const parser = getParser();
        const ast = parser.parse(value);

        // break-on-boundaries work done here
        breakOnBoundaries(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}\title{part1}` +
                String.raw`\begin{_section}\title{Section1}Hi, this is a section\end{_section}` + 
                String.raw`\begin{_chapter}\title{chap1}This is a chapter` + 
                String.raw`\begin{_section}\title{Subsection2}\end{_section}\end{_chapter}\end{_part}`
        );
    });
});
