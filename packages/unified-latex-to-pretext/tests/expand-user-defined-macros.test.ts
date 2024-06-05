import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { ExpandUserDefinedMacros } from "@unified-latex/unified-latex-to-pretext/libs/expand-user-defined-macros";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:expand-user-deifned-macros", () => {
    let value: string;

    it("can expand newcommand", () => {
        value = String.raw`\newcommand{\foo}{\bar} \foo`;

        const parser = getParser();
        const ast = parser.parse(value);

        ExpandUserDefinedMacros(ast);

        expect(printRaw(ast)).toEqual(String.raw`\newcommand{\foo}{\bar} \bar`);
    });

    it("can expand renewcommand", () => {
        value = String.raw`\renewcommand{\O}{\mathcal{O}} \O`; // not subbing at all

        const parser = getParser();
        const ast = parser.parse(value);

        ExpandUserDefinedMacros(ast);

        expect(printRaw(ast)).toEqual(
            String.raw`\renewcommand{\O}{\mathcal{O}} \mathcal{O}`
        );
    });

    it("can recursively expand multiple user-defined commands", () => {
        value = String.raw`\newcommand{\join}{\vee} 
                            \join
                            \renewcommand{\vee}{\foo}
                            \vee`;

        const parser = getParser();
        const ast = parser.parse(value);

        ExpandUserDefinedMacros(ast);

        expect(printRaw(ast)).toEqual(String.raw`\newcommand{\join}{\vee} `+
                                                String.raw`\foo \renewcommand{\vee}{\foo} \foo`);
    });
});
