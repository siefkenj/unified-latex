import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { toXml } from "xast-util-to-xml";
import { xmlCompilePlugin } from "../libs/convert-to-pretext";
import { unified } from "unified";
import {
    gatherAuthorInfo,
    renderCollectedAuthorInfo,
} from "../libs/author-info";
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
/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:author-info", () => {
    let sample: string;
    const parser = getParser();
    let file: VFile;

    it("groups author name, address, institution, and email by \\author boundary", () => {
        file = new VFile();
        sample =
            "\\author{First Middle LastName} \n \\address{Department, Address}";
        let input = "        First Middle LastName";
        let input1 =
            "                               \n          Department, Address";
        // \address with no intervening \author folds into the preceding author's group.
        expect(gatherAuthorInfo(parser.parse(sample), file)).toEqual([
            {
                personname: parser.parse(input).content,
                institution: parser.parse(input1).content,
            },
        ]);

        sample = "\\address{Affiliation}";
        input = "         Affiliation";
        // No \author precedes this one, so it becomes its own standalone group.
        expect(gatherAuthorInfo(parser.parse(sample), file)).toEqual([
            { institution: parser.parse(input).content },
        ]);

        sample = "\\affil{Affiliation}";
        expect(gatherAuthorInfo(parser.parse(sample), file)).toEqual([]);

        sample =
            "\\author{First Author} \\email{example@example.com} \\author{Second Author}";
        input = "        First Author";
        input1 = "                             example@example.com";
        let input2 =
            "                                                          Second Author";
        // Each \author starts a new group; \email attaches to the one before it.
        expect(gatherAuthorInfo(parser.parse(sample), file)).toEqual([
            {
                personname: parser.parse(input).content,
                email: parser.parse(input1).content,
            },
            { personname: parser.parse(input2).content },
        ]);
    });

    it("renders each author group as its own <author> tag", () => {
        sample =
            "\\author{First Middle LastName} \n \\address{Department, Address}";
        let rendered = renderCollectedAuthorInfo(
            gatherAuthorInfo(parser.parse(sample), file)
        );
        const toXast = toPretextWithLoggerFactory(file.message.bind(file));
        const xxx = unified()
            .use(xmlCompilePlugin)
            .runSync({ type: "root", children: rendered.flatMap(toXast) });
        expect(normalizeHtml(toXml(xxx))).toEqual(
            normalizeHtml(
                "<author><personname>First Middle LastName</personname><institution>Department, Address</institution></author>"
            )
        );

        sample = "\\address{Affiliation}";
        rendered = renderCollectedAuthorInfo(
            gatherAuthorInfo(parser.parse(sample), file)
        );
        const xxx1 = unified()
            .use(xmlCompilePlugin)
            .runSync({ type: "root", children: rendered.flatMap(toXast) });
        expect(normalizeHtml(toXml(xxx1))).toEqual(
            normalizeHtml(
                "<author><institution>Affiliation</institution></author>"
            )
        );

        sample =
            "\\author{First Author} \\email{example@example.com} \\author{Second Author}";
        rendered = renderCollectedAuthorInfo(
            gatherAuthorInfo(parser.parse(sample), file)
        );
        const xxx2 = unified()
            .use(xmlCompilePlugin)
            .runSync({ type: "root", children: rendered.flatMap(toXast) });
        expect(normalizeHtml(toXml(xxx2))).toEqual(
            normalizeHtml(
                "<author><personname>First Author</personname><email>example@example.com</email></author>" +
                    "<author><personname>Second Author</personname></author>"
            )
        );
    });
});
