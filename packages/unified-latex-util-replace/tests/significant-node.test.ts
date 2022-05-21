import util from "util";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "../libs/replace-node";
import { firstSignificantNodeIndex, lastSignificantNodeIndex } from "..";
import { arg, s, SP } from "@unified-latex/unified-latex-builder";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { strToNodes } from "../../test-common";
import * as Ast from "@unified-latex/unified-latex-types";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-replace", () => {
    it("can find last significant node", () => {
        let nodes = strToNodes("a b c");
        expect(lastSignificantNodeIndex(nodes)).toEqual(4);

        nodes = strToNodes("a b c%foo");
        expect(lastSignificantNodeIndex(nodes)).toEqual(4);
        
        nodes = strToNodes("a b c %foo");
        expect(lastSignificantNodeIndex(nodes)).toEqual(4);
        
        nodes = strToNodes("a b c %foo\n%bar");
        expect(lastSignificantNodeIndex(nodes)).toEqual(4);
        
        nodes = strToNodes("a b c%foo\n\n%bar");
        expect(lastSignificantNodeIndex(nodes)).toEqual(6);
        
        nodes = strToNodes("a b c%foo\n\n%bar");
        expect(lastSignificantNodeIndex(nodes, true)).toEqual(4);
    });
    it("can find first significant node", () => {
        let nodes = strToNodes("a b c");
        expect(firstSignificantNodeIndex(nodes)).toEqual(0);

        nodes = strToNodes("%foo\na b c");
        expect(firstSignificantNodeIndex(nodes)).toEqual(1);

        nodes = strToNodes("%foo\n%bar\na b c");
        expect(firstSignificantNodeIndex(nodes)).toEqual(2);

        nodes = strToNodes("%foo\n\na b c");
        expect(firstSignificantNodeIndex(nodes)).toEqual(1);
        
        nodes = strToNodes("%foo\n\na b c");
        expect(firstSignificantNodeIndex(nodes, true)).toEqual(2);
    });
});
