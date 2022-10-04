import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { findRegionInArray } from "./find-region";
import { refineRegions, Region, splitByRegions } from "./regions";
import { SKIP, visit } from "@unified-latex/unified-latex-util-visit";
import { reparseMacroNames } from "./reparse-macro-names";

const expl3Find = {
    start: match.createMacroMatcher(["ExplSyntaxOn"]),
    end: match.createMacroMatcher(["ExplSyntaxOff"]),
};
const atLetterFind = {
    start: match.createMacroMatcher(["makeatletter"]),
    end: match.createMacroMatcher(["makeatother"]),
};

/**
 * Find regions between `\ExplSyntaxOn...\ExplSyntaxOff` and `\makeatletter...\makeatother`.
 * Returns an object containing regions where one or both syntax's apply.
 */
export function findExpl3AndAtLetterRegionsInArray(tree: Ast.Node[]): {
    explOnly: Region[];
    atLetterOnly: Region[];
    both: Region[];
} {
    const expl3 = findRegionInArray(tree, expl3Find.start, expl3Find.end);
    const atLetter = findRegionInArray(
        tree,
        atLetterFind.start,
        atLetterFind.end
    );

    const regionMap = new Map([
        ...(expl3.map((x) => [x, "expl"]) as [Region, "expl"][]),
        ...(atLetter.map((x) => [x, "atLetter"]) as [Region, "atLetter"][]),
    ]);
    const all = refineRegions([...expl3, ...atLetter]);

    const ret = {
        explOnly: [] as Region[],
        atLetterOnly: [] as Region[],
        both: [] as Region[],
    };

    for (let i = 0; i < all.regions.length; i++) {
        const region = all.regions[i];
        const containedIn = all.regionsContainedIn[i];
        if (containedIn.size === 2) {
            ret.both.push(region);
            continue;
        }
        for (const v of containedIn.values()) {
            if (regionMap.get(v) === "expl") {
                ret.explOnly.push(region);
            }
            if (regionMap.get(v) === "atLetter") {
                ret.atLetterOnly.push(region);
            }
        }
    }

    // Regions of size 1 only contain the starting/stopping macro, so they should be discarded
    ret.explOnly = ret.explOnly.filter((r) => r.end - r.start > 1);
    ret.atLetterOnly = ret.atLetterOnly.filter((r) => r.end - r.start > 1);
    ret.both = ret.both.filter((r) => r.end - r.start > 1);

    return ret;
}

const atLetterSet = new Set(["@"]);
const explSet = new Set(["_", ":"]);
const bothSet = new Set(["_", ":", "@"]);

/**
 * Find regions between `\ExplSyntaxOn...\ExplSyntaxOff` and `\makeatletter...\makeatother`
 * and reparse their contents so that the relevant characters (e.g., `@`, `_`, and `:`) become
 * part of the macro names.
 */
export function reparseExpl3AndAtLetterRegions(tree: Ast.Ast) {
    visit(
        tree,
        {
            leave: (nodes) => {
                const regions = findExpl3AndAtLetterRegionsInArray(nodes);
                // In all likelihood, we don't need to do any reparsing, so bail early here
                const totalNumRegions =
                    regions.both.length +
                    regions.atLetterOnly.length +
                    regions.explOnly.length;
                if (totalNumRegions === 0) {
                    return;
                }

                const splits = splitByRegions(nodes, regions);
                const processed: typeof nodes = [];
                for (const [key, slice] of splits) {
                    switch (key) {
                        case null:
                            processed.push(...slice);
                            continue;
                        case "atLetterOnly":
                            reparseMacroNames(slice, atLetterSet);
                            processed.push(...slice);
                            continue;
                        case "explOnly":
                            reparseMacroNames(slice, explSet);
                            processed.push(...slice);
                            continue;
                        case "both":
                            reparseMacroNames(slice, bothSet);
                            processed.push(...slice);
                            continue;
                        default:
                            throw new Error(
                                `Unexpected case when splitting ${key}`
                            );
                    }
                }

                nodes.length = 0;
                nodes.push(...processed);
                return SKIP;
            },
        },
        { includeArrays: true, test: Array.isArray }
    );
}
