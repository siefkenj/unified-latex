import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { renderAuthorInfo } from "../libs/author-info";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, { parser: "html" });
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

describe("unified-latex-to-pretext:author-info", () => {
    let html: string;
    const parser = getParser();

    it("converts author, department, institution, and email information", () => {
        html =
            "\\author{First Middle LastName} \n \\address{Department, Address}";
        expect(renderAuthorInfo(parser.parse(html))).toEqual(
            normalizeHtml(
                "<author>\n <personname>First Middle LastName</personname>\n <department>Department, Address</department>\n </author>"
            )
        );

        html = "\\affil{Affiliation}";
        expect(renderAuthorInfo(parser.parse(html))).toEqual(
            normalizeHtml(
                "<author>\n <institution>Affiliation</institution>\n </author>"
            )
        );

        html =
            "\\author{First Author} \n \\email{example@example.com} \n \\author{Second Author}";
        expect(renderAuthorInfo(parser.parse(html))).toEqual(
            normalizeHtml(
                "<author>\n <personname>First Author</personname>\n <email>example@example.com</email>\n <personname>Second Author</personname> \n </author>"
            )
        );
    });
});
