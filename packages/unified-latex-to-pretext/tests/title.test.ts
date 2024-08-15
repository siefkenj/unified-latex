import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { toXml } from "xast-util-to-xml";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";
import { unified } from "unified";
import { gatherTitle, renderTitle } from "../libs/title";
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
    const parser = getParser();

    it("collects title content", () => {
        sample =
            "\\title{Title}";
        expect(gatherTitle(parser.parse(sample))).toEqual([]);

        sample = 
            "\\title{Title} \n \\maketitle";
        input = "     Title"
        expect(gatherTitle(parser.parse(sample))).toEqual(parser.parse(input).content);
    });
});