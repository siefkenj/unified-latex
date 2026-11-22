import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexToPretext } from "../libs/unified-latex-plugin-to-pretext";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";

async function normalizeHtml(str: string) {
    try {
        return await Prettier.format(str, {
            parser: "html",
            plugins: ["@prettier/plugin-xml"],
        });
    } catch {
        console.warn("Could not format HTML string", str);
        return str;
    }
}

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:worksheet-pages", () => {
    let html: string;

    const process = (value: string) =>
        processLatexViaUnified()
            .use(unifiedLatexToPretext, { producePretextFragment: true })
            .use(xmlCompilePlugin)
            .processSync({ value }).value as string;

    it("divides a \\worksheet division into pages on \\newpage", async () => {
        html = process(
            `\\worksheet{My Worksheet}\nFirst page text.\n\n\\newpage\n\nSecond page text.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>My Worksheet</title>` +
                    `<page><p>First page text.</p></page>` +
                    `<page><p>Second page text.</p></page>` +
                    `</worksheet>`
            )
        );
    });

    it("divides a \\handout division into pages on \\newpage", async () => {
        html = process(
            `\\handout{Handout}\nOne.\n\n\\clearpage\n\nTwo.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<handout>` +
                    `<title>Handout</title>` +
                    `<page><p>One.</p></page>` +
                    `<page><p>Two.</p></page>` +
                    `</handout>`
            )
        );
    });

    it("divides a worksheet environment into pages", async () => {
        html = process(
            `\\begin{worksheet}\nFirst page.\n\n\\newpage\n\nSecond page.\n\\end{worksheet}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<page><p>First page.</p></page>` +
                    `<page><p>Second page.</p></page>` +
                    `</worksheet>`
            )
        );
    });

    it("divides a handout environment into pages", async () => {
        html = process(
            `\\begin{handout}\nFirst page.\n\n\\newpage\n\nSecond page.\n\\end{handout}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<handout>` +
                    `<page><p>First page.</p></page>` +
                    `<page><p>Second page.</p></page>` +
                    `</handout>`
            )
        );
    });

    it("puts whole block environments on the page they belong to", async () => {
        html = process(
            `\\worksheet{W}\\begin{activity}First activity.\\end{activity}\n\n\\newpage\n\n\\begin{activity}Second activity.\\end{activity}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>W</title>` +
                    `<page><activity><p>First activity.</p></activity></page>` +
                    `<page><activity><p>Second activity.</p></activity></page>` +
                    `</worksheet>`
            )
        );
    });

    it("keeps an introduction and conclusion outside the pages", async () => {
        // The schema orders a printout as
        // `(Objectives? & IntroductionDivision?), (Page+ | PrintoutBlock+), (Outcomes? & ConclusionDivision?)`,
        // so these divisions are siblings of the pages, not content of them.
        html = process(
            `\\worksheet{W}\\begin{introduction}Read this.\\end{introduction}\n\nOne.\n\n\\newpage\n\nTwo.\n\n\\begin{conclusion}Done.\\end{conclusion}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>W</title>` +
                    `<introduction><p>Read this.</p></introduction>` +
                    `<page><p>One.</p></page>` +
                    `<page><p>Two.</p></page>` +
                    `<conclusion><p>Done.</p></conclusion>` +
                    `</worksheet>`
            )
        );
    });

    it("leaves a worksheet with no page breaks undivided", async () => {
        html = process(`\\worksheet{W}\nOne.\n\nTwo.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet><title>W</title><p>One.</p><p>Two.</p></worksheet>`
            )
        );
    });

    it("ignores a page break at the very start or end of a worksheet", async () => {
        html = process(`\\worksheet{W}\\newpage\n\nOnly page.\n\n\\newpage`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet><title>W</title><p>Only page.</p></worksheet>`
            )
        );
    });

    it("does not create pages outside a worksheet or handout", async () => {
        // PreTeXt has nowhere to put a page division in a `<section>`, so the
        // break is dropped as it always was.
        html = process(`\\section{S}\nIntro.\n\n\\newpage\n\nAfter.`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section><title>S</title><p>Intro.</p><p>After.</p></section>`
            )
        );
    });

    it("keeps a following subdivision out of the pages", async () => {
        // A `\subsection` ends the worksheet rather than nesting inside it (see
        // break-on-boundaries.ts), so it must not be swept into the last page.
        html = process(
            `\\worksheet{W}\nOne.\n\n\\newpage\n\nTwo.\n\n\\subsection{S}\nAfter the worksheet.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>W</title>` +
                    `<page><p>One.</p></page>` +
                    `<page><p>Two.</p></page>` +
                    `</worksheet>` +
                    `<subsection><title>S</title><p>After the worksheet.</p></subsection>`
            )
        );
    });

    it("keeps a paged worksheet and a following subdivision as peers inside a section", async () => {
        html = process(
            `\\section{Sec}\nIntro.\n\n\\worksheet{W}\nOne.\n\n\\newpage\n\nTwo.\n\n\\subsection{S}\nAfter the worksheet.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section>` +
                    `<title>Sec</title>` +
                    `<p>Intro.</p>` +
                    `<worksheet>` +
                    `<title>W</title>` +
                    `<page><p>One.</p></page>` +
                    `<page><p>Two.</p></page>` +
                    `</worksheet>` +
                    `<subsection><title>S</title><p>After the worksheet.</p></subsection>` +
                    `</section>`
            )
        );
    });

    it("divides a worksheet on a page break inside a nested block", async () => {
        // A break PreTeXt can't honor where it stands becomes a boundary after
        // the block containing it.
        html = process(
            `\\worksheet{W}\\begin{activity}Work here.\\newpage\\end{activity}\n\nAfter.`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>W</title>` +
                    `<page><activity><p>Work here.</p></activity></page>` +
                    `<page><p>After.</p></page>` +
                    `</worksheet>`
            )
        );
    });
});
