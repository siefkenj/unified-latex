import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:break-on-boundaries", () => {
   
    let value: string;

    it("can break on sections", () => {
        value = String.raw`\section{Foo}
                            Hi, this is a section
                                
                            \section{Bar}
                            This is another section`;

        const parser = getParser();
        const ast = parser.parse(value);

        // break-on-boundaries work done here

        expect(printRaw(ast)).toEqual([String.raw`\begin{_section}
                                                \title{Foo}
                                                Hi, this is a section
                                            \end{_section}
                                            \begin{_section}
                                                \title{Bar}
                                                This is another section
                                            \end{_section}`]);
    });
    it("can break on a subsection", () => {
        value = String.raw`\subsection{subsection}
                            Hi, this is a subsection`;

        const parser = getParser();
        const ast = parser.parse(value);

        // break-on-boundaries work done here

        expect(printRaw(ast)).toEqual([String.raw``]);
    });
    it("can break on subsection between subsections properly", () => {
        value = String.raw`\section{First Section}
                            Hi, this is a section
                            \subsection{Inner Subsection}
                            This is a subsection
                            \section{Second Subsection}
                            This is another section`;

        const parser = getParser();
        const ast = parser.parse(value);

        // break-on-boundaries work done here

        expect(printRaw(ast)).toEqual([String.raw``]);
    });
});