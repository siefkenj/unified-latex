import Prettier from "prettier/standalone";
import { prettierPluginLatex } from "../libs/prettier-plugin-latex";
import "../../test-common";

/* eslint-env jest */

describe("unified-latex-prettier", () => {
    const formatter = (x: string) =>
        Prettier.format(x, {
            printWidth: 30,
            useTabs: true,
            parser: "latex-parser",
            plugins: [prettierPluginLatex],
        });
    it("prints latex code", () => {
        const STRINGS = [
            { inStr: "$x^{21}$", outStr: "$x^{21}$" },
            {
                inStr: "\\begin{enumerate}\\item a b c\\item\\end{enumerate}",
                outStr: "\\begin{enumerate}\n\t\\item a b c\n\n\t\\item\n\\end{enumerate}",
            },
            {
                inStr:
                    "\\documentclass[foo]{bar} a b c\n" +
                    "\n" +
                    "\\begin{enumerate}  \\item hi there this \\emph{is stuff $\\mathbb 4somegoodstuff$ is really, really great!}\\item and other stuff\\end{enumerate}\n",
                outStr: `\\documentclass[foo]{bar}
a
b
c

\\begin{enumerate}
\t\\item hi there this \\emph{is
\t\tstuff
\t\t$\\mathbb{4}somegoodstuff$
\t\tis really, really great!}

\t\\item and other stuff
\\end{enumerate}`,
            },
            {
                inStr: "\\begin{xx}\\begin{yy}x\\end{yy}\\end{xx}",
                outStr: "\\begin{xx}\n\t\\begin{yy}\n\t\tx\n\t\\end{yy}\n\\end{xx}",
            },
            { inStr: "\\begin{xx}\\end{xx}", outStr: "\\begin{xx}\n\\end{xx}" },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("prints comments", () => {
        const STRINGS = [
            { inStr: "%", outStr: "%" },
            { inStr: "x%", outStr: "x%" },
            { inStr: "x %", outStr: "x %" },
            { inStr: "x % abc", outStr: "x % abc" },
            { inStr: "x % abc\ny", outStr: "x % abc\ny" },
            { inStr: "x % abc\n\ny", outStr: "x % abc\n\ny" },
            { inStr: "x % abc\n\n", outStr: "x % abc" },
            { inStr: "x\n%\n\ny", outStr: "x\n%\n\ny" },
            { inStr: "%\n%\n\ny", outStr: "%\n%\n\ny" },
            {
                inStr: "\\begin{a}\n%\n\\end{a}",
                outStr: "\\begin{a}\n\t%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}x%\n\\end{a}",
                outStr: "\\begin{a}\n\tx%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}x%\n\n\\end{a}",
                outStr: "\\begin{a}\n\tx%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}%\n\n\\end{a}",
                outStr: "\\begin{a}%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n%\n\n\\end{a}",
                outStr: "\\begin{a}\n\t%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n\n%\n\n\\end{a}",
                outStr: "\\begin{a}\n\t%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}%\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}%\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "%x\n\n%y",
                outStr: "%x\n\n%y",
            },
            {
                inStr: "x\n\n%y",
                outStr: "x\n\n%y",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("prints math environments", () => {
        const STRINGS = [
            { inStr: "\\[x\\]", outStr: "\\[\n\tx\n\\]" },
            { inStr: "\\[\\]", outStr: "\\[\n\\]" },
            { inStr: "\\[ \\]", outStr: "\\[\n\\]" },
            { inStr: "\\[\n\n\\]", outStr: "\\[\n\\]" },
            { inStr: "\\[\n\nx\n\\]", outStr: "\\[\n\tx\n\\]" },
            { inStr: "\\[%xx\n\\]", outStr: "\\[%xx\n\\]" },
            { inStr: "\\[\n%xx\n\\]", outStr: "\\[\n\t%xx\n\\]" },
            // Special case of empty inline math environment
            { inStr: "$ $", outStr: "$ $" },
            { inStr: "$\n$", outStr: "$ $" },
            { inStr: "$x$", outStr: "$x$" },
            { inStr: "$\nx$", outStr: "$x$" },
            { inStr: "$ x \n$", outStr: "$x$" },
            { inStr: "$%\n$", outStr: "$%\n$" },
            { inStr: "$a%\n$", outStr: "$a%\n$" },
            { inStr: "$\na%\n$", outStr: "$a%\n$" },
            { inStr: "$%xmom\na%\n$", outStr: "$%xmom\na%\n$" },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("insert newlines around environments", () => {
        const STRINGS = [
            { inStr: "\\[\\] x", outStr: "\\[\n\\]\nx" },
            { inStr: "y \\[\\]", outStr: "y\n\\[\n\\]" },
            { inStr: "\\[\\]\\[\\]", outStr: "\\[\n\\]\n\\[\n\\]" },
            { inStr: "\\[\\] \\[\\]", outStr: "\\[\n\\]\n\\[\n\\]" },
            { inStr: "\\[\\]\n\\[\\]", outStr: "\\[\n\\]\n\\[\n\\]" },
            { inStr: "\\[\\]\n\n\\[\\]", outStr: "\\[\n\\]\n\n\\[\n\\]" },
            {
                inStr: "\\begin{a}\\end{a} x",
                outStr: "\\begin{a}\n\\end{a}\nx",
            },
            {
                inStr: "y \\begin{a}\\end{a}",
                outStr: "y\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a} \\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\n\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\n\\begin{a}\n\\end{a}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("verb tests", () => {
        const STRINGS = [
            { inStr: "\\verb|%$\n|", outStr: "\\verb|%$\n|" },
            { inStr: "\\verb!{!", outStr: "\\verb!{!" },
            { inStr: "x\\verb!{!", outStr: "x\\verb!{!" },
            { inStr: "\\verb!{!y", outStr: "\\verb!{!y" },
            { inStr: "\\verb!{! y", outStr: "\\verb!{! y" },
            { inStr: "\\verb!%!\ny", outStr: "\\verb!%! y" },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("verbatim environments tests", () => {
        const STRINGS = [
            {
                inStr: "\\begin{verbatim}\\end{verbatim}",
                outStr: "\\begin{verbatim}\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}a b  c\\end{verbatim}",
                outStr: "\\begin{verbatim}a b  c\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}\na b \n\n c\\end{verbatim}",
                outStr: "\\begin{verbatim}\na b \n\n c\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}\n\\end{verbatim}",
                outStr: "\\begin{verbatim}\n\\end{verbatim}",
            },
            {
                inStr: "a \\begin{verbatim}\\end{verbatim}",
                outStr: "a\n\\begin{verbatim}\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}\\end{verbatim} b",
                outStr: "\\begin{verbatim}\\end{verbatim}\nb",
            },
            {
                inStr: "\\begin{verbatim*}\n\n\n  $\\end{verbatim*}",
                outStr: "\\begin{verbatim*}\n\n\n  $\\end{verbatim*}",
            },
            {
                inStr: "\\begin{comment}\n\n\n  $\\end{comment}",
                outStr: "\\begin{comment}\n\n\n  $\\end{comment}",
            },
            {
                inStr: "\\begin{comment}\n\n\n  $\\end{comment}",
                outStr: "\\begin{comment}\n\n\n  $\\end{comment}",
            },
            {
                inStr: "\\begin{a}\\begin{comment}\n\n\n  $\\end{comment}\\end{a}",
                outStr: "\\begin{a}\n\t\\begin{comment}\n\n\n  $\\end{comment}\n\\end{a}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("comments at start of environments tests", () => {
        const STRINGS = [
            {
                inStr: "\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}%xx\n\\end{a}",
                outStr: "\\begin{a}%xx\n\\end{a}",
            },
            {
                inStr: "\\begin{a}%xx\nx\\end{a}",
                outStr: "\\begin{a}%xx\n\tx\n\\end{a}",
            },
            {
                inStr: "\\begin{a}%xx\n\nx\n\n\n\\end{a}",
                outStr: "\\begin{a}%xx\n\tx\n\\end{a}",
            },
            {
                inStr: "\\begin{a} %xx\n\\end{a}",
                outStr: "\\begin{a} %xx\n\\end{a}",
            },
            {
                inStr: "\\begin{a} %xx\n%y\n\\end{a}",
                outStr: "\\begin{a} %xx\n\t%y\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n%xx\n%y\n\\end{a}",
                outStr: "\\begin{a}\n\t%xx\n\t%y\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n %xx\n%y\n\\end{a}",
                outStr: "\\begin{a}\n\t%xx\n\t%y\n\\end{a}",
            },
            // Math environments should print the same way
            {
                inStr: "\\begin{equation}\\end{equation}",
                outStr: "\\begin{equation}\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation}%xx\n\\end{equation}",
                outStr: "\\begin{equation}%xx\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation} %xx\n\\end{equation}",
                outStr: "\\begin{equation} %xx\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation} %xx\n%y\n\\end{equation}",
                outStr: "\\begin{equation} %xx\n\t%y\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation}\n%xx\n%y\n\\end{equation}",
                outStr: "\\begin{equation}\n\t%xx\n\t%y\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation}\n %xx\n%y\n\\end{equation}",
                outStr: "\\begin{equation}\n\t%xx\n\t%y\n\\end{equation}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("matrix environment tests", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}a\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a\\\\b\\\\c\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\\n\tb \\\\\n\tc\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a&b\\\\c&d\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta & b \\\\\n\tc & d\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}axxx&b\\\\c&d\\end{matrix}",
                outStr: "\\begin{matrix}\n\taxxx & b \\\\\n\tc    & d\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}axxx&b\\\\c&dxxx\\end{matrix}",
                outStr: "\\begin{matrix}\n\taxxx & b    \\\\\n\tc    & dxxx\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a\\\\[4pt]b\\\\c\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\[4pt]\n\tb \\\\\n\tc\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a\\\\%\nb\\\\c\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\ %\n\tb \\\\\n\tc\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\n%xx\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\t%xx\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\n%xx\n%yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\t%xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\n%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\t%xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\tx %xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x&y%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\tx & y %xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x&y\\\\%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\tx & y \\\\ %xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x\n%y\n\\\\z\\\\%ww\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\tx %y\n\t\\\\\n\tz \\\\ %ww\n\\end{matrix}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("matrix environment with comments at start", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}%xx\na\\end{matrix}",
                outStr: "\\begin{matrix}%xx\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix} %xx\na\\end{matrix}",
                outStr: "\\begin{matrix} %xx\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}    %xx\na\\end{matrix}",
                outStr: "\\begin{matrix} %xx\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}%xx\n%ab\na\\end{matrix}",
                outStr: "\\begin{matrix}%xx\n\t%ab\n\ta\n\\end{matrix}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("matrix environment alignment of cell items", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}\na\\\\ b\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\\n\tb\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\na\\\\\n\\\\\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\\n\t\\\\\n\\end{matrix}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it.skip("matrix environment with parbreak", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}a\n\nb\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta\n\n\tb\n\\end{matrix}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("comments at the end of an arguments list get a closing newline", () => {
        const STRINGS = [
            {
                inStr: "\\mathbb{x%matrix\n}",
                outStr: "\\mathbb{x%matrix\n}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("Formats aligned environments", () => {
        const STRINGS = [
            {
                inStr: "\\begin{align}ab& c\\\\d&eee\\end{align}",
                outStr: "\\begin{align}\n\tab & c   \\\\\n\td  & eee\n\\end{align}",
            },
            {
                inStr: "\\begin{align}& c\\\\d&e\\end{align}",
                outStr: "\\begin{align}\n\t  & c \\\\\n\td & e\n\\end{align}",
            },
            {
                inStr: "\\begin{align}a&b\\\\[44pt]d&e\\\\xx&yy\\end{align}",
                outStr: "\\begin{align}\n\ta  & b  \\\\[44pt]\n\td  & e  \\\\\n\txx & yy\n\\end{align}",
            },
            {
                inStr: "\\begin{align}a\\\\\\hline bbb\\end{align}",
                outStr: "\\begin{align}\n\ta   \\\\\n\t\\hline\n\tbbb\n\\end{align}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }
    });
    it("Allows indenting of `printRaw` content (e.g., content inside of a group)", () => {
        const STRINGS = [
            {
                inStr: "\\begin{x}{%\n}\\end{x}",
                outStr: "\\begin{x}\n\t{%\n\t}\n\\end{x}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }
    });
    it("Linebreaks before and after \\section command", () => {
        const STRINGS = [
            {
                inStr: "\\section{x}",
                outStr: "\\section{x}",
            },
            {
                inStr: "\\section{x}a",
                outStr: "\\section{x}\na",
            },
            {
                inStr: "\\section{x} a",
                outStr: "\\section{x}\na",
            },
            {
                inStr: "\\section{x}% a comment",
                outStr: "\\section{x}% a comment",
            },
            {
                inStr: "\\section{x} % a sameline comment",
                outStr: "\\section{x} % a sameline comment",
            },
            {
                inStr: "x\\section{x} a",
                outStr: "x\n\\section{x}\na",
            },
            {
                inStr: "x \\section{x} a",
                outStr: "x\n\\section{x}\na",
            },
            {
                inStr: "x\n\\section{x} a",
                outStr: "x\n\\section{x}\na",
            },
            {
                inStr: "%comment\n\\section{x} a",
                outStr: "%comment\n\\section{x}\na",
            },
            {
                inStr: "x\n\n\\section{x} a",
                outStr: "x\n\n\\section{x}\na",
            },
            {
                inStr: "\\begin{x}\\end{x}\\section{x}\\begin{x}\\end{x}",
                outStr: "\\begin{x}\n\\end{x}\n\\section{x}\n\\begin{x}\n\\end{x}",
            },
            {
                inStr: "\\begin{x}\\end{x}%xxx\n\\section{x}\\begin{x}\\end{x}",
                outStr: "\\begin{x}\n\\end{x}%xxx\n\\section{x}\n\\begin{x}\n\\end{x}",
            },
            {
                inStr: "\\maketitle a",
                outStr: "\\maketitle\na",
            },
            {
                inStr: "\\maketitle\\maketitle",
                outStr: "\\maketitle\n\\maketitle",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }
    });

    it("Formats matrix environments with optional arguments", () => {
        const STRINGS = [
            {
                inStr: "\\begin{NiceArray}a&b&c\\end{NiceArray}",
                outStr: "\\begin{NiceArray}{a}\n\t & b & c\n\\end{NiceArray}",
            },
            {
                inStr: "\\begin{NiceArray}[abc]a&b&c\\end{NiceArray}",
                outStr: "\\begin{NiceArray}[abc]{a}\n\t & b & c\n\\end{NiceArray}",
            },
            {
                inStr: "\\begin{NiceArray}[abc]a[x]&b&c\\end{NiceArray}",
                outStr: "\\begin{NiceArray}[abc]{a}[x]\n\t & b & c\n\\end{NiceArray}",
            },
            {
                inStr: "\\begin{NiceArray}[abc]a [x]&b&c\\end{NiceArray}",
                outStr: "\\begin{NiceArray}[abc]{a}\n\t[x] & b & c\n\\end{NiceArray}",
            },
            {
                inStr: "\\begin{NiceArray} a [x]&b&c\\end{NiceArray}",
                outStr: "\\begin{NiceArray}{a}\n\t[x] & b & c\n\\end{NiceArray}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }
    });
    it("Macros and Environments with inMathMode=true specified have their contents processed as math", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}a^2\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta^{2}\n\\end{matrix}",
            },
            {
                inStr: "\\ensuremath{x^2}",
                outStr: "\\ensuremath{x^{2}}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }
    });

    it("no excess newlines between comments separated by pars", () => {
        const STRINGS = [{ inStr: "%\n\n%", outStr: "%\n\n%" }];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("no excess newlines between breakAround arguments separated by pars", () => {
        const STRINGS = [
            {
                inStr: "\\section{x}\n\n\\section{y}",
                outStr: "\\section{x}\n\n\\section{y}",
            },
            {
                inStr: "\\section{x}\n\n\\begin{y}\\end{y}",
                outStr: "\\section{x}\n\n\\begin{y}\n\\end{y}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("preamble macros aren't forced to be broken", () => {
        const STRINGS = [
            {
                inStr: "\\documentclass{a}\\emph{x y}",
                outStr: "\\documentclass{a}\n\\emph{x y}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    it("macro arguments wrap paragraph-style by default", () => {
        const STRINGS = [
            {
                inStr: "\\clap{foooooo, barooooo, bazooooo, bangoooo}",
                outStr: "\\clap{foooooo, barooooo,\nbazooooo, bangoooo}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    it("preamble math doesn't have extra hardlines", () => {
        const STRINGS = [
            {
                inStr: "\\documentclass{a}\\[a\\begin{x}y\\end{x}\\]",
                outStr: "\\documentclass{a}\n\\[\n\ta\n\t\\begin{x}\n\t\ty\n\t\\end{x}\n\\]",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("enumerate with comment only inserts one newline", () => {
        const STRINGS = [
            {
                inStr: "\\begin{enumerate}a%\n\\item\\end{enumerate}",
                outStr: `\\begin{enumerate}
\ta%

\t\\item
\\end{enumerate}`,
            },
            {
                inStr: "\\begin{enumerate}\\item%\n\\item\\end{enumerate}",
                outStr: `\\begin{enumerate}
\t\\item %

\t\\item
\\end{enumerate}`,
            },
            {
                inStr: "\\begin{enumerate} %\n\\end{enumerate}",
                outStr: `\\begin{enumerate} %
\\end{enumerate}`,
            },
            {
                inStr: "\\begin{enumerate}\\item%\n\n%\n\\end{enumerate}",
                outStr: `\\begin{enumerate}
\t\\item %

\t%
\\end{enumerate}`,
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
});
