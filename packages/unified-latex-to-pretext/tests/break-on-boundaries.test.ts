import { describe, it, expect } from "vitest";
import util from "util";
import { getParser, parseMath } from "@unified-latex/unified-latex-util-parse";
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
        // console.log(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\begin{_part}\title{Foo}Hi, this is a part\end{_part}\begin{_part}\title{Bar}This is another part\end{_part}`
        );
    });
    it("can break on a subsection", () => {
        value = String.raw`\subsection{subsection}
                            Hi, this is a subsection`;

        const parser = getParser();
        const ast = parser.parse(value);

        // break-on-boundaries work done here

        expect(printRaw(ast)).toEqual(String.raw``);
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

        expect(printRaw(ast)).toEqual(String.raw``);
    });
});
