import * as Ast from "@unified-latex/unified-latex-types";

export type Region = { start: number; end: number };

/**
 * Given `regions`, a list of `Region`s (not necessarily ordered, possibly overlapping), return a list of in-order,
 * non-overlapping regions and a corresponding list containing a set of the original `Region`s that the new region
 * is a subset of.
 */
export function refineRegions(regions: Region[]): {
    regions: Region[];
    regionsContainedIn: Set<Region>[];
} {
    const _regions = [...regions];
    _regions.sort((a, b) => a.start - b.start);
    const cutPointsSet = new Set(_regions.flatMap((r) => [r.start, r.end]));
    const cutPoints = Array.from(cutPointsSet);
    cutPoints.sort((a, b) => a - b);

    const retRegions: Region[] = [];
    const retRegionsContainedIn: Set<Region>[] = [];

    // We will be checking what regions we are completely contained in.
    // Because `_regions` is sorted by start, `seekIndex` will be incremented
    // by end, so that we don't do too much array testing.
    let seekIndex = 0;
    for (let i = 0; i < cutPoints.length - 1; i++) {
        const start = cutPoints[i];
        const end = cutPoints[i + 1];
        const region = { start, end };
        const regionContainedIn: Set<Region> = new Set();

        let encounteredEndPastStart = false;
        for (let j = seekIndex; j < _regions.length; j++) {
            const superRegion = _regions[j];
            if (superRegion.end >= region.start) {
                encounteredEndPastStart = true;
            }
            if (!encounteredEndPastStart && superRegion.end < region.start) {
                // In this case, the region (and all regions that came before)
                // end before the region we are testing, so we may safely skip past it
                // from here on out.
                seekIndex = j + 1;
                continue;
            }

            if (superRegion.start > end) {
                // Because `_regions` is sorted, we can stop here
                break;
            }
            if (
                superRegion.start <= region.start &&
                superRegion.end >= region.end
            ) {
                encounteredEndPastStart = true;
                regionContainedIn.add(superRegion);
            }
        }

        if (regionContainedIn.size > 0) {
            // We only count if we are contained in a subregion
            retRegions.push(region);
            retRegionsContainedIn.push(regionContainedIn);
        }
    }

    return { regions: retRegions, regionsContainedIn: retRegionsContainedIn };
}

/**
 * Split an array up into the disjoint regions specified by `regionRecord`.
 * Returned is a list of tuples, the first item being the key of `regionRecord` if there
 * was a corresponding region, or `null` if there was no corresponding region.
 *
 * This function assumes that the regions in `regionRecord` are disjoint and fully contained
 * within the bounds of `array`.
 */
export function splitByRegions<
    T,
    RegionRecord extends Record<string, Region[]>
>(array: T[], regionsRecord: RegionRecord) {
    const ret: [keyof RegionRecord | null, T[]][] = [];

    const indices = [0, array.length];
    const reverseMap: Record<string, keyof RegionRecord> = {};
    for (const [key, records] of Object.entries(regionsRecord)) {
        indices.push(
            ...records.flatMap((r) => {
                reverseMap["" + [r.start, r.end]] = key;
                return [r.start, r.end];
            })
        );
    }
    indices.sort((a, b) => a - b);

    for (let i = 0; i < indices.length - 1; i++) {
        const start = indices[i];
        const end = indices[i + 1];
        if (start === end) {
            continue;
        }
        const regionKey = reverseMap["" + [start, end]];

        ret.push([regionKey || null, array.slice(start, end)]);
    }

    return ret;
}
