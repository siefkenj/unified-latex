import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { gatherAuthorInfo } from "../libs/author-info";

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

    it("collects author name, department, institution, and email information", () => {
        sample =
            "\\author{First Middle LastName} \n \\address{Department, Address}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual(
            [{"personname": "First Middle LastName"}, {"address": "Department, Address"}]
        );

        sample = "\\affil{Affiliation}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual(
                [{"address": "Affiliation"}]   
        );

        sample =
            "\\author{First Author} \\email{example@example.com} \\author{Second Author}";
        expect(gatherAuthorInfo(parser.parse(sample))).toEqual(
                [{"personname": "First Author"}, {"email": "example@example.com"}, {"personname": "Second Author"}]
            
        );
    });
});
