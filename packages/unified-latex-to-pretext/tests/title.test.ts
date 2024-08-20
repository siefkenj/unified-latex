import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { toXml } from "xast-util-to-xml";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";
import { unified } from "unified";
import { gatherTitle, renderTitle } from "../libs/title";
import { VFile } from "vfile";
import { toPretextWithLoggerFactory } from "../libs/pretext-subs/to-pretext";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, { parser: "html" });
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

describe("unified-latex-to-pretext:title", () => {
    let sample: string;
    let input: string;
    let file: VFile;
    const parser = getParser();

    it("collects title content", () => {
        sample = "\\title{Title}";
        input = "       Title";
        expect(gatherTitle(parser.parse(sample), file)).toEqual(
            parser.parse(input).content
        );

        sample = "\\title{Title1} \n \\title{Title2}";
        input = "               \n        Title2";
        expect(gatherTitle(parser.parse(sample), file)).toEqual(
            parser.parse(input).content
        );
    });

    it("parses title content", () => {
        sample = "\\title{Title}";
        let rendered = renderTitle(gatherTitle(parser.parse(sample), file));
        const toXast = toPretextWithLoggerFactory(file.message.bind(file));
        const xxx = unified()
            .use(xmlCompilePlugin)
            .runSync({ type: "root", children: [toXast(rendered)].flat() });
        expect(normalizeHtml(toXml(xxx))).toEqual(
            normalizeHtml("<title>Title</title>")
        );
    });
});
