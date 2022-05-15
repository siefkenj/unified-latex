import util from "util";
import { s } from "../../unified-latex-builder";
import { printRaw } from "../../unified-latex-util-print-raw";
import { htmlLike } from "../libs/builders";
import { extractFromHtmlLike } from "../libs/extractors";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-html-like", () => {
    it("can build macro html-like macros", () => {
        expect(printRaw(htmlLike({ tag: "foo" }))).toEqual("\\html-tag:foo{}");

        expect(
            printRaw(htmlLike({ tag: "foo", content: s("hi there") }))
        ).toEqual("\\html-tag:foo{hi there}");

        expect(
            printRaw(
                htmlLike({
                    tag: "foo",
                    attributes: { bar: "val" },
                    content: s("hi there"),
                })
            )
        ).toEqual('\\html-tag:foo{\\html-attr:bar{"val"}hi there}');

        expect(
            printRaw(
                htmlLike({
                    tag: "foo",
                    attributes: { bar: "val", baz: "val2" },
                    content: s("hi there"),
                })
            )
        ).toEqual(
            '\\html-tag:foo{\\html-attr:bar{"val"}\\html-attr:baz{"val2"}hi there}'
        );
    });
    it("can extract contents from macro html-like macros", () => {
        expect(extractFromHtmlLike(htmlLike({ tag: "foo" }))).toEqual({
            tag: "foo",
            content: [],
            attributes: {},
        });

        expect(
            extractFromHtmlLike(
                htmlLike({ tag: "foo", content: s("hi there") })
            )
        ).toEqual({ tag: "foo", content: [s("hi there")], attributes: {} });

        expect(
            extractFromHtmlLike(
                htmlLike({
                    tag: "foo",
                    attributes: { bar: "val" },
                    content: [s("hi there")],
                })
            )
        ).toEqual({
            tag: "foo",
            attributes: { bar: "val" },
            content: [s("hi there")],
        });

        expect(
            extractFromHtmlLike(
                htmlLike({
                    tag: "foo",
                    attributes: { bar: "val", baz: "val2" },
                    content: s("hi there"),
                })
            )
        ).toEqual({
            tag: "foo",
            attributes: { bar: "val", baz: "val2" },
            content: [s("hi there")],
        });
    });
});
