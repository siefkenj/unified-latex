import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import { unifiedLatexToPretext } from "../libs/unified-latex-plugin-to-pretext";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";

async function normalizeHtml(str: string) {
    try {
        // `Prettier.format` is async, so it has to be awaited *inside* the try
        // for the catch to see a parse failure. Valid PreTeXt is not always
        // valid HTML -- `<p><ul>...</ul></p>` is legal here but Prettier's HTML
        // parser rejects it -- and without the await those cases blow up with a
        // SyntaxError instead of falling back to an exact string comparison.
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

describe("unified-latex-to-pretext:exam-class", () => {
    let html: string;

    const process = (value: string) =>
        processLatexViaUnified()
            .use(unifiedLatexToPretext, { producePretextFragment: true })
            .use(xmlCompilePlugin)
            .processSync({ value }).value as string;

    it("converts a simple question to an exercise", async () => {
        html = process(
            String.raw`\begin{questions}\question This is a question\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet><exercise><statement><p>This is a question</p></statement></exercise></worksheet>`
            )
        );
    });

    it("converts a question with a point value", async () => {
        html = process(
            String.raw`\begin{questions}\question[5] This is a question\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet><exercise points="5"><statement><p>This is a question</p></statement></exercise></worksheet>`
            )
        );
    });

    it("converts multiple questions", async () => {
        html = process(
            String.raw`\begin{questions}\question First\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise><statement><p>First</p></statement></exercise>` +
                    `<exercise><statement><p>Second</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts a question with parts", async () => {
        html = process(
            String.raw`\begin{questions}\question Here is the intro.\begin{parts}\part First part\part Second part\end{parts}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<introduction><p>Here is the intro.</p></introduction>` +
                    `<task><statement><p>First part</p></statement></task>` +
                    `<task><statement><p>Second part</p></statement></task>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts a question with parts and point values", async () => {
        html = process(
            String.raw`\begin{questions}\question[10] Intro text.\begin{parts}\part[4] Part A\part[6] Part B\end{parts}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise points="10">` +
                    `<introduction><p>Intro text.</p></introduction>` +
                    `<task points="4"><statement><p>Part A</p></statement></task>` +
                    `<task points="6"><statement><p>Part B</p></statement></task>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts a question with parts but no intro text", async () => {
        html = process(
            String.raw`\begin{questions}\question\begin{parts}\part First part\part Second part\end{parts}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<task><statement><p>First part</p></statement></task>` +
                    `<task><statement><p>Second part</p></statement></task>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts subparts nested inside parts", async () => {
        html = process(
            String.raw`\begin{questions}\question Intro.\begin{parts}\part Part intro.\begin{subparts}\subpart Subpart A\subpart Subpart B\end{subparts}\end{parts}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<introduction><p>Intro.</p></introduction>` +
                    `<task>` +
                    `<introduction><p>Part intro.</p></introduction>` +
                    `<task><statement><p>Subpart A</p></statement></task>` +
                    `<task><statement><p>Subpart B</p></statement></task>` +
                    `</task>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("does not treat exam \\part as a document division", async () => {
        // \part inside \begin{parts} must not be converted to a <part> division element
        html = process(
            String.raw`\begin{questions}\question Q.\begin{parts}\part A\part B\end{parts}\end{questions}`
        );
        expect(html).not.toContain("<part>");
        expect(html).toContain("<task>");
    });

    it("a question with multi-paragraph content", async () => {
        html = process(
            String.raw`\begin{questions}\question First paragraph.

Second paragraph.\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<statement>` +
                    `<p>First paragraph.</p>` +
                    `<p>Second paragraph.</p>` +
                    `</statement>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("preserves \\begin{solution} inside a question", async () => {
        html = process(
            String.raw`\begin{questions}\question What is 1+1?\begin{solution}It is 2.\end{solution}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<statement><p>What is 1+1?</p></statement>` +
                    `<solution><p>It is 2.</p></solution>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts trailing \\vfill into exercise workspace", async () => {
        html = process(
            String.raw`\begin{questions}\question First question\vfill\question Second question\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise workspace="1in"><statement><p>First question</p></statement></exercise>` +
                    `<exercise><statement><p>Second question</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts trailing \\vskip into exercise workspace", async () => {
        html = process(
            String.raw`\begin{questions}\question First question\vskip 1in\question Second question\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise workspace="1in"><statement><p>First question</p></statement></exercise>` +
                    `<exercise><statement><p>Second question</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts trailing \\vspace into exercise workspace", async () => {
        html = process(
            String.raw`\begin{questions}\question First question\vspace{1.5in}\question Second question\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise workspace="1.5in"><statement><p>First question</p></statement></exercise>` +
                    `<exercise><statement><p>Second question</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts trailing spacer commands into task workspace", async () => {
        html = process(
            String.raw`\begin{questions}\question Intro.\begin{parts}\part First part\vfill\part Second part\vskip 2in\end{parts}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<introduction><p>Intro.</p></introduction>` +
                    `<task workspace="1in"><statement><p>First part</p></statement></task>` +
                    `<task workspace="2in"><statement><p>Second part</p></statement></task>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("keeps a mid-question spacer on the paragraph it follows, not on the exercise", async () => {
        // The exercise/task only wins when the spacer trails its whole body.
        html = process(
            String.raw`\begin{questions}\question First\vspace{1in}` +
                "\n\n" +
                String.raw`Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise><statement>` +
                    `<p workspace="1in">First</p><p>Second</p>` +
                    `</statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("keeps a spacer trailing a multi-paragraph question on the exercise", async () => {
        html = process(
            String.raw`\begin{questions}\question First` +
                "\n\n" +
                String.raw`Second\vspace{1in}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise workspace="1in"><statement>` +
                    `<p>First</p><p>Second</p>` +
                    `</statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts a fractional \\vskip into exercise workspace", async () => {
        html = process(
            String.raw`\begin{questions}\question First question\vskip 1.5in\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise workspace="1.5in"><statement><p>First question</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("converts trailing \\vspace into task workspace", async () => {
        html = process(
            String.raw`\begin{questions}\question Intro.\begin{parts}\part First part\vspace{2.5in}\part Second part\end{parts}\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise>` +
                    `<introduction><p>Intro.</p></introduction>` +
                    `<task workspace="2.5in"><statement><p>First part</p></statement></task>` +
                    `<task><statement><p>Second part</p></statement></task>` +
                    `</exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("splits worksheet into pages on \\newpage", async () => {
        html = process(
            String.raw`\begin{questions}\question First\newpage\question Second\question Third\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<page>` +
                    `<exercise><statement><p>First</p></statement></exercise>` +
                    `</page>` +
                    `<page>` +
                    `<exercise><statement><p>Second</p></statement></exercise>` +
                    `<exercise><statement><p>Third</p></statement></exercise>` +
                    `</page>` +
                    `</worksheet>`
            )
        );
    });

    it("splits worksheet into pages on \\clearpage and supports multiple breaks", async () => {
        html = process(
            String.raw`\begin{questions}\question First\clearpage\question Second\newpage\question Third\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<page>` +
                    `<exercise><statement><p>First</p></statement></exercise>` +
                    `</page>` +
                    `<page>` +
                    `<exercise><statement><p>Second</p></statement></exercise>` +
                    `</page>` +
                    `<page>` +
                    `<exercise><statement><p>Third</p></statement></exercise>` +
                    `</page>` +
                    `</worksheet>`
            )
        );
    });

    it("uses \\title inside questions environment as worksheet title", async () => {
        html = process(
            String.raw`\begin{questions}\title{My Worksheet}\question First\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>My Worksheet</title>` +
                    `<exercise><statement><p>First</p></statement></exercise>` +
                    `<exercise><statement><p>Second</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("combines \\title with page breaks", async () => {
        html = process(
            String.raw`\begin{questions}\title{Paged Worksheet}\question First\newpage\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>Paged Worksheet</title>` +
                    `<page>` +
                    `<exercise><statement><p>First</p></statement></exercise>` +
                    `</page>` +
                    `<page>` +
                    `<exercise><statement><p>Second</p></statement></exercise>` +
                    `</page>` +
                    `</worksheet>`
            )
        );
    });

    it("splits on \\pagebreak, but not on a mere \\pagebreak[n] hint", async () => {
        const paged = `<worksheet>` +
            `<page><exercise><statement><p>First</p></statement></exercise></page>` +
            `<page><exercise><statement><p>Second</p></statement></exercise></page>` +
            `</worksheet>`;
        const unpaged = `<worksheet>` +
            `<exercise><statement><p>First</p></statement></exercise>` +
            `<exercise><statement><p>Second</p></statement></exercise>` +
            `</worksheet>`;

        for (const macro of [String.raw`\pagebreak`, String.raw`\pagebreak[4]`]) {
            html = process(
                String.raw`\begin{questions}\question First${macro}\question Second\end{questions}`
            );
            expect(await normalizeHtml(html)).toEqual(await normalizeHtml(paged));
        }

        // `\pagebreak[0]`..`\pagebreak[3]` only nudge TeX's page-breaking
        // penalties; they don't say where the author wants a page to end.
        for (const macro of [String.raw`\pagebreak[0]`, String.raw`\pagebreak[3]`]) {
            html = process(
                String.raw`\begin{questions}\question First${macro}\question Second\end{questions}`
            );
            expect(await normalizeHtml(html)).toEqual(await normalizeHtml(unpaged));
        }
    });

    it("hoists a page break out of a question body to the exercise boundary", async () => {
        // PreTeXt can divide a worksheet between blocks but not inside one, so
        // a break buried in a question (here, inside a `parts` list) becomes a
        // boundary after the exercise containing it.
        html = process(
            String.raw`\begin{questions}\question Intro\begin{parts}\part One\newpage\part Two\end{parts}\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<page>` +
                    `<exercise>` +
                    `<introduction><p>Intro</p></introduction>` +
                    `<task><statement><p>One</p></statement></task>` +
                    `<task><statement><p>Two</p></statement></task>` +
                    `</exercise>` +
                    `</page>` +
                    `<page><exercise><statement><p>Second</p></statement></exercise></page>` +
                    `</worksheet>`
            )
        );
    });

    it("does not emit an empty page for repeated or trailing page breaks", async () => {
        html = process(
            String.raw`\begin{questions}\question First\newpage\newpage\question Second\newpage\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<page><exercise><statement><p>First</p></statement></exercise></page>` +
                    `<page><exercise><statement><p>Second</p></statement></exercise></page>` +
                    `</worksheet>`
            )
        );
    });

    it("ignores a page break that would leave a single page", async () => {
        html = process(
            String.raw`\begin{questions}\newpage\question First\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<exercise><statement><p>First</p></statement></exercise>` +
                    `<exercise><statement><p>Second</p></statement></exercise>` +
                    `</worksheet>`
            )
        );
    });

    it("keeps \\vfill before a page break as workspace on the exercise", async () => {
        html = process(
            String.raw`\begin{questions}\question First\vfill\newpage\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<page><exercise workspace="1in"><statement><p>First</p></statement></exercise></page>` +
                    `<page><exercise><statement><p>Second</p></statement></exercise></page>` +
                    `</worksheet>`
            )
        );
    });

    it("contributes to an enclosing worksheet division instead of nesting one", async () => {
        html = process(
            String.raw`\worksheet{Week 1}\begin{questions}\question First\newpage\question Second\end{questions}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<worksheet>` +
                    `<title>Week 1</title>` +
                    `<page><exercise><statement><p>First</p></statement></exercise></page>` +
                    `<page><exercise><statement><p>Second</p></statement></exercise></page>` +
                    `</worksheet>`
            )
        );
    });
});
