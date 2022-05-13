import { toHtml } from "hast-util-to-html";
import util from "util";
import { strToNodes } from "../../test-common";
import { toHastDirect } from "../libs/html-subs/to-hast-direct";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-hast:to-hast-direct", () => {
    it("can non-recursively convert to hast", () => {
        expect(toHtml(strToNodes("foo bar").map(toHastDirect))).toEqual(
            "foo bar"
        );

        expect(toHtml(strToNodes("$foo bar$").map(toHastDirect))).toEqual(
            '<span class="inline-math">foo bar</span>'
        );

        expect(toHtml(strToNodes("\\verb|x^2|").map(toHastDirect))).toEqual(
            '<pre class="verb">x^2</pre>'
        );

        expect(toHtml(strToNodes("%foo").map(toHastDirect))).toEqual(
            "<!--foo-->"
        );
    });
});
