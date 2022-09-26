import * as Ast from "@unified-latex/unified-latex-types";
import { Region } from "./regions";

/**
 * Find all contiguous segments in the array that are between start and end blocks.
 * The `start` and `end` are functions that determine when a region starts and ends.
 */
export function findRegionInArray(
    tree: Ast.Node[],
    start: (node: Ast.Node) => boolean,
    end: (node: Ast.Node) => boolean
): Region[] {
    const ret: Region[] = [];
    let currRegion: Region = { start: undefined as any, end: tree.length };
    for (let i = 0; i < tree.length; i++) {
        const node = tree[i];
        if (start(node)) {
            currRegion.start = i;
        }
        if (end(node)) {
            currRegion.end = i + 1;
            ret.push(currRegion);
            currRegion = { start: undefined as any, end: tree.length };
        }
    }

    if (currRegion.start != null) {
        // Regions don't necessarily have to encounter an `end` to end.
        ret.push(currRegion);
    }
    return ret;
}
