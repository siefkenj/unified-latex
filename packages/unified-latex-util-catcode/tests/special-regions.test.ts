import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { findExpl3AndAtLetterRegionsInArray, reparseExpl3AndAtLetterRegions } from "../libs/special-regions";

import { strToNodes } from "../../test-common";
import { match } from "@unified-latex/unified-latex-util-match";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

function extractRegions(
    nodes: Ast.Node[],
    regions: { start: number; end: number }[]
): Ast.Node[] {
    const sliced: Ast.Node[] = [];
    for (const region of regions) {
        sliced.push(...nodes.slice(region.start, region.end));
    }

    return sliced;
}

describe("unified-latex-utils-catcode", () => {
    it("Can find \\ExplSyntaxOn and \\makeatletter regions", () => {
        let parsed = strToNodes("a b \\makeatletter c d \\makeatother e f");
        let found = findExpl3AndAtLetterRegionsInArray(parsed);
        expect(found).toEqual({
            atLetterOnly: [{ end: 11, start: 4 }],
            both: [],
            explOnly: [],
        });

        parsed = strToNodes("a b \\ExplSyntaxOn c d \\ExplSyntaxOff e f");
        found = findExpl3AndAtLetterRegionsInArray(parsed);
        expect(found).toEqual({
            explOnly: [{ end: 11, start: 4 }],
            both: [],
            atLetterOnly: [],
        });

        parsed = strToNodes("a b c d \\ExplSyntaxOff e f");
        found = findExpl3AndAtLetterRegionsInArray(parsed);
        expect(found).toEqual({
            explOnly: [],
            both: [],
            atLetterOnly: [],
        });

        parsed = strToNodes(
            "a b \\makeatletter\\ExplSyntaxOn c d \\ExplSyntaxOff\\makeatother e f"
        );
        found = findExpl3AndAtLetterRegionsInArray(parsed);
        expect(found).toEqual({
            atLetterOnly: [],
            both: [{ end: 12, start: 5 }],
            explOnly: [],
        });

        parsed = strToNodes(
            "a b \\makeatletter\\ExplSyntaxOn c d \\makeatother\\ExplSyntaxOff e f"
        );
        found = findExpl3AndAtLetterRegionsInArray(parsed);
        expect(found).toEqual({
            atLetterOnly: [],
            both: [{ end: 12, start: 5 }],
            explOnly: [],
        });
    });
    it("Can reparse ExplSyntaxOn and \\makeatletter regions", () => {
        let matcher = match.createMacroMatcher(["c@b", "c_b", "c_b:N"])
        
        let parsed: Ast.Node[] 
        parsed = strToNodes("a \\c@b b \\makeatletter \\c@b d \\makeatother e f");
        expect(parsed.filter(matcher)).toHaveLength(0)
        reparseExpl3AndAtLetterRegions(parsed)
        expect(parsed.filter(matcher)).toHaveLength(1)

        parsed = strToNodes("a \\c@b b \\ExplSyntaxOn\\makeatletter \\c_b d \\makeatother e f");
        expect(parsed.filter(matcher)).toHaveLength(0)
        reparseExpl3AndAtLetterRegions(parsed)
        expect(parsed.filter(matcher)).toHaveLength(1)
       
        parsed = strToNodes("a \\c@b b \\ExplSyntaxOn \\c@b \\c_b:N \\makeatletter \\c@b \\c_b d \\makeatother e f \\c@b x \\c_b");
        expect(parsed.filter(matcher)).toHaveLength(0)
        reparseExpl3AndAtLetterRegions(parsed)
        expect(parsed.filter(matcher)).toHaveLength(4)
    });
});
