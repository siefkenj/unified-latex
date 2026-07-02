import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { processLatexViaUnified } from "@unified-latex/unified-latex";
import {
    unifiedLatexToPretext,
    PluginOptions,
} from "../libs/unified-latex-plugin-to-pretext";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, {
            parser: "html",
            plugins: ["@prettier/plugin-xml"],
        });
    } catch {
        console.warn("Could not format HTML string", str);
        return str;
    }
}
/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:plus-includes", () => {
    const processFile = (value: string, options?: PluginOptions) =>
        processLatexViaUnified()
            .use(unifiedLatexToPretext, {
                producePretextFragment: true,
                ...options,
            })
            .use(xmlCompilePlugin)
            .processSync({ value });

    const process = (value: string, options?: PluginOptions) =>
        processFile(value, options).value as string;

    it("converts \\plus division includes", async () => {
        const html = process(String.raw`\plus{section}{sec-intro}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:section ref="sec-intro"/>`)
        );
    });

    it("converts \\plus asset includes with attributes", async () => {
        const html = process(String.raw`\plus[width=50]{image}{fig-euler}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:image ref="fig-euler" width="50%"/>`)
        );
    });

    it("handles escaped percents, quoted values, bare keys, and multiple attributes", async () => {
        let html = process(String.raw`\plus[width=50\%]{image}{fig}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:image ref="fig" width="50%"/>`)
        );

        html = process(
            String.raw`\plus[width=50, margin=5, landscape]{worksheet}{ws-1}`
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<plus:worksheet ref="ws-1" width="50%" margin="5%" landscape="yes"/>`
            )
        );

        html = process(String.raw`\plus[aspect="16:9"]{video}{vid-1}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:video ref="vid-1" aspect="16:9"/>`)
        );
    });

    it("sanitizes refs the same way as \\label/\\ref", async () => {
        const html = process(String.raw`\plus{section}{sec:intro}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:section ref="sec-intro"/>`)
        );
    });

    it("warns on unrecognized types but still emits the tag", async () => {
        const file = processFile(String.raw`\plus{sectoin}{sec-intro}`);
        expect(file.value as string).toContain("<plus:sectoin");
        expect(
            file.messages.some((m) => m.message.includes('"sectoin"'))
        ).toBe(true);
    });

    it("extraTypes suppresses the unknown-type warning", () => {
        const file = processFile(String.raw`\plus{poem}{poem-1}`, {
            plusIncludes: { extraTypes: ["poem"] },
        });
        expect(file.value as string).toContain('<plus:poem ref="poem-1"');
        expect(file.messages.length).toBe(0);
    });

    it("removes \\plus with a missing type and warns", () => {
        const file = processFile(String.raw`\plus{}{sec-intro}`);
        expect(file.value as string).not.toContain("plus:");
        expect(
            file.messages.some((m) => m.message.includes("missing its type"))
        ).toBe(true);
    });

    it("converts \\include to a generic plus include", async () => {
        const html = process(String.raw`\include{ch-graphs}`);
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:include ref="ch-graphs"/>`)
        );
    });

    it("uses resolveType to type \\include includes", async () => {
        const html = process(String.raw`\include{ch-graphs}`, {
            plusIncludes: { resolveType: () => "chapter" },
        });
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(`<plus:chapter ref="ch-graphs"/>`)
        );
    });

    it("can produce xi:include output instead", async () => {
        let html = process(String.raw`\plus{section}{sec-intro}`, {
            plusIncludes: { format: "xinclude" },
        });
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="sec-intro.ptx"/>`
            )
        );

        html = process(String.raw`\include{ch-graphs}`, {
            plusIncludes: { format: "xinclude" },
        });
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="ch-graphs.ptx"/>`
            )
        );

        html = process(String.raw`\plus{section}{sec-intro}`, {
            plusIncludes: {
                format: "xinclude",
                resolveHref: (ref, type) => `${type}s/${ref}.xml`,
            },
        });
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="sections/sec-intro.xml"/>`
            )
        );
    });

    it("warns when attributes are dropped in xi:include output", () => {
        const file = processFile(String.raw`\plus[width=50]{image}{fig}`, {
            plusIncludes: { format: "xinclude" },
        });
        expect(file.value as string).toContain("<xi:include");
        expect(file.value as string).not.toContain("width");
        expect(
            file.messages.some((m) => m.message.includes("dropped"))
        ).toBe(true);
    });

    it("does not wrap \\plus or \\include in p tags", async () => {
        const html = process(
            "before\n\n\\plus{section}{sec-a}\n\n\\include{sec-b}\n\nafter"
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<p>before</p><plus:section ref="sec-a"/><plus:include ref="sec-b"/><p>after</p>`
            )
        );
    });

    it("works inside a full document", async () => {
        const html = process(
            [
                "\\documentclass{article}",
                "\\begin{document}",
                "\\section{Graphs}",
                "Some text.",
                "",
                "\\plus{subsection}{sub-degree}",
                "\\end{document}",
            ].join("\n")
        );
        expect(await normalizeHtml(html)).toEqual(
            await normalizeHtml(
                `<section><title>Graphs</title><p>Some text.</p><plus:subsection ref="sub-degree"/></section>`
            )
        );
    });
});
