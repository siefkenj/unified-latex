import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { findRegionInArray } from "../libs/find-region";

import { strToNodes } from "../../test-common";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

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
    it("Can find regions", () => {
        let parsed = strToNodes("a b \\foo c d \\bar e f");
        let regions = findRegionInArray(
            parsed,
            match.createMacroMatcher(["foo"]),
            match.createMacroMatcher(["bar"])
        );
        let sliced = extractRegions(parsed, regions);
        expect(printRaw(sliced)).toEqual("\\foo c d \\bar");

        // No end marker
        parsed = strToNodes("a b \\foo c d e f");
        regions = findRegionInArray(
            parsed,
            match.createMacroMatcher(["foo"]),
            match.createMacroMatcher(["bar"])
        );
        sliced = extractRegions(parsed, regions);
        expect(printRaw(sliced)).toEqual("\\foo c d e f");

        // Multiple regions
        parsed = strToNodes("\\foo c d\\bar e \\foo!f");
        regions = findRegionInArray(
            parsed,
            match.createMacroMatcher(["foo"]),
            match.createMacroMatcher(["bar"])
        );
        sliced = extractRegions(parsed, regions);

        expect(printRaw(sliced)).toEqual("\\foo c d\\bar\\foo!f");
    });
});
