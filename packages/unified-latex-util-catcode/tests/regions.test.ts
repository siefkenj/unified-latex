import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { refineRegions, Region, splitByRegions } from "../libs/regions";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-utils-catcode", () => {
    it("Can refine regions", () => {
        let regions: Region[] = [];
        let refined: ReturnType<typeof refineRegions>;

        regions = [{ start: 5, end: 10 }];
        refined = refineRegions(regions);
        expect(refined).toEqual({
            regions: [{ start: 5, end: 10 }],
            regionsContainedIn: [new Set([{ start: 5, end: 10 }])],
        });

        regions = [
            { start: 5, end: 10 },
            { start: 20, end: 30 },
        ];
        refined = refineRegions(regions);
        expect(refined).toEqual({
            regions: [
                { start: 5, end: 10 },
                { start: 20, end: 30 },
            ],
            regionsContainedIn: [
                new Set([{ start: 5, end: 10 }]),
                new Set([{ start: 20, end: 30 }]),
            ],
        });

        regions = [
            { start: 5, end: 20 },
            { start: 10, end: 30 },
        ];
        refined = refineRegions(regions);
        expect(refined).toEqual({
            regions: [
                { start: 5, end: 10 },
                { start: 10, end: 20 },
                { start: 20, end: 30 },
            ],
            regionsContainedIn: [
                new Set([{ start: 5, end: 20 }]),
                new Set([
                    { start: 5, end: 20 },
                    { start: 10, end: 30 },
                ]),
                new Set([{ start: 10, end: 30 }]),
            ],
        });
    });
    it("Can split by regions", () => {
        let regionsRecord: Record<"a" | "b", Region[]> = {
            a: [{ start: 2, end: 5 }],
            b: [],
        };
        let array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        expect(splitByRegions(array, regionsRecord)).toEqual([
            [null, [0, 1]],
            ["a", [2, 3, 4]],
            [null, [5, 6, 7, 8, 9, 10]],
        ]);

        regionsRecord = {
            a: [
                { start: 2, end: 5 },
                { start: 9, end: 11 },
            ],
            b: [{ start: 5, end: 9 }],
        };
        expect(splitByRegions(array, regionsRecord)).toEqual([
            [null, [0, 1]],
            ["a", [2, 3, 4]],
            ["b", [5, 6, 7, 8]],
            ["a", [9, 10]],
        ]);

        array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        expect(splitByRegions(array, regionsRecord)).toEqual([
            [null, [0, 1]],
            ["a", [2, 3, 4]],
            ["b", [5, 6, 7, 8]],
            ["a", [9, 10]],
            [null, [11]],
        ]);
    });
});
