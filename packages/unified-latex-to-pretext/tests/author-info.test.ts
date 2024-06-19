import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { gatherAuthorInfo, renderAuthorInfo } from "../libs/author-info";

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
    let sample: string;
    const parser = getParser();

    it("converts author, department, institution, and email information", () => {
        sample =
            "\\author{First Middle LastName} \\address{Department, Address}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual(
            normalizeHtml(
                "<author> <personname>First Middle LastName</personname> <department>Department, Address</department> </author>"
            )
        );

        sample = "\\affil{Affiliation}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual(
            normalizeHtml(
                "<author> <institution>Affiliation</institution> </author>"
            )
        );

        sample =
            "\\author{First Author} \\email{example@example.com} \\author{Second Author}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual(
            normalizeHtml(
                "<author> <personname>First Author</personname> <email>example@example.com</email> <personname>Second Author</personname> </author>"
            )
        );
    });
});
