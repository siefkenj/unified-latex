import { describe, it, expect } from "vitest";
import { toXml } from "xast-util-to-xml";
import util from "util";
import { strToNodes } from "../../test-common";
import { toPretextDirect } from "../libs/pretext-subs/to-pretext-direct";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:to-pretext-direct", () => {
    it("can non-recursively convert to hast", () => {
        expect(toXml(strToNodes("foo bar").map(toPretextDirect))).toEqual(
            "foo bar"
        );

        expect(toXml(strToNodes("$foo bar$").map(toPretextDirect))).toEqual(
            "<m>foo bar</m>"
        );

        expect(toXml(strToNodes("%foo").map(toPretextDirect))).toEqual(
            "<!--foo-->"
        );
    });
});
