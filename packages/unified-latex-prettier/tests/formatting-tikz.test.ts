import * as Prettier from "prettier/standalone";
import { prettierPluginLatex } from "../libs/prettier-plugin-latex";
import "../../test-common";
import * as fs from "node:fs/promises";
import path from "node:path";

/* eslint-env jest */
const formatter = async (x: string) =>
    await Prettier.format(x, {
        printWidth: 30,
        useTabs: true,
        parser: "latex-parser",
        plugins: [prettierPluginLatex],
    });
const formatterWide = async (x: string) =>
    await Prettier.format(x, {
        printWidth: 60,
        useTabs: false,
        tabWidth: 4,
        parser: "latex-parser",
        plugins: [prettierPluginLatex],
    });

describe("unified-latex-prettier", () => {
    const STRINGS = [
        {
            inStr: `\\begin{tikzpicture}\\draw(0,0) to [bend right] (1,1);\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}\n\t\\draw (0,0) to[bend right]\n\t\t(1,1);\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\node{a};\\node{b};\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}\n\t\\node {a};\n\t\\node {b};\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\draw[blue,fill=red](0,0)--(1,1)node[above right,orange]{a};\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}\n\t\\draw[blue, fill=red]\n\t\t(0,0) -- (1,1)\n\t\tnode[above right, orange]\n\t\t\t{a};\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\path(a)--(b)-|(c)--cycle;\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}\n\t\\path (a) --\n\t\t(b) -|\n\t\t(c) --\n\t\tcycle;\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\draw svg {M 0 0 L 20 20 h 10 a 10 10 0 0 0 -20 0};\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}\n\t\\draw svg {M 0 0 L 20 20 h 10 a 10 10 0 0 0 -20 0};\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\filldraw [fill=red!20] (0,1) svg[scale=2] {h 10 v 10 h -10} node [above left] {upper left} -- cycle;\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}
\t\\filldraw[fill=red!20]
\t\t(0,1)
\t\tsvg[scale=2]
\t\t\t{h 10 v 10 h -10}
\t\tnode[above left]
\t\t\t{upper left}
\t\t--
\t\tcycle;\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\draw[line width=10pt] (0,0) .. controls (1,1) .. (4,0)
                .. controls (5,0) and (5,1) .. (4,1);\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}
\t\\draw[line width=10pt]
\t\t(0,0) .. controls (1,1) ..
\t\t(4,0) .. controls
\t\t\t(5,0) and
\t\t\t(5,1) .. (4,1);\n\\end{tikzpicture}`,
        },
        {
            inStr: `\\begin{tikzpicture}\\draw (.5,1) rectangle (2,0.5) (3,0) rectangle (3.5,1.5) -- (2,0);\\end{tikzpicture}`,
            outStr: `\\begin{tikzpicture}
\t\\draw (.5,1) rectangle
\t\t(2,0.5)
\t\t(3,0) rectangle
\t\t(3.5,1.5) -- (2,0);\n\\end{tikzpicture}`,
        },
    ];

    for (const { inStr, outStr } of STRINGS) {
        it(`Can print tikz string "${inStr}"`, async () => {
            await expect(inStr).toFormatAs(outStr, formatter);
        });
    }

    it("prints tikz samples", async () => {
        // ts-ignore
        const inStr = await fs.readFile(
            "./packages/unified-latex-prettier/tests/samples/tikz/unformatted.tex",
            {
                encoding: "utf-8",
            }
        );
        const outStr = await fs.readFile(
            "./packages/unified-latex-prettier/tests/samples/tikz/formatted-wide.tex",
            {
                encoding: "utf-8",
            }
        );
        await expect(inStr).toFormatAs(outStr, formatterWide);
    });
});
