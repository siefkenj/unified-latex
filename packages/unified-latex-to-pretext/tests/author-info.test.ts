import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { toXml } from "xast-util-to-xml";
import { unified } from "unified";
import {
    gatherAuthorInfo,
    renderCollectedAuthorInfo,
} from "../libs/author-info";

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

    it("collects author name, address, institution, and email information", () => {
        sample =
            "\\author{First Middle LastName} \n \\address{Department, Address}";
        let input = "        First Middle LastName";
        let input1 =
            "                               \n          Department, Address";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual([
            { personname: parser.parse(input).content },
            { address: parser.parse(input1).content },
        ]);

        sample = "\\address{Affiliation}";
        input = "         Affiliation";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual([
            { address: parser.parse(input).content },
        ]);

        sample = "\\affil{Affiliation}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual([
            "error"
        ]);

        sample =
            "\\author{First Author} \\email{example@example.com} \\author{Second Author}";
        input = "        First Author";
        input1 = "                             example@example.com";
        let input2 =
            "                                                          Second Author";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual([
            { personname: parser.parse(input).content },
            { email: parser.parse(input1).content },
            { personname: parser.parse(input2).content },
        ]);
    });

    it("parses author name, address, and email information", () => {
        sample =
            "\\author{First Middle LastName} \n \\address{Department, Address}";
        expect(
            renderCollectedAuthorInfo(gatherAuthorInfo(parser.parse(sample)))
        ).toEqual(
            normalizeHtml(
                "<author> <personname>First Middle LastName</personname> <department>Department, Address</department> </author>"
            )
        );

        sample = "\\address{Affiliation}";
        expect(
            renderCollectedAuthorInfo(gatherAuthorInfo(parser.parse(sample)))
        ).toEqual(
            normalizeHtml(
                "<author> <institution>Affiliation</institution> </author>"
            )
        );

        sample =
            "\\author{First Author} \\email{example@example.com} \\author{Second Author}";
        expect(
            renderCollectedAuthorInfo(gatherAuthorInfo(parser.parse(sample)))
        ).toEqual(
            normalizeHtml(
                "<author> <personname>First Author</personname> <email>example@example.com</email> <personname>Second Author</personname> </author>"
            )
        );
    });
});
