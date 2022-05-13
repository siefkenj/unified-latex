import util from "util";
import { parse } from "../../unified-latex-util-parse";
import { parseTabularSpec, printRaw as tabularPrintRaw } from "../package/tabularx";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-ctan:tabularx", () => {
    const TABULAR_SPEC_STRINGS = [
        "c",
        "ccc",
        "lrc",
        "|c|c|",
        "||cccc||",
        "|m{5em}|m{1cm}|m{1cm}|",
        "cp{1cm}",
        ">{\\centering}p{3.5cm}>{\\centering}p{3.5cm}",
        "r@{.}l",
        ">{\\bfseries}l",
        "p{1cm}@{foo}m{2cm}!{bar}b{3cm}",
        "|X|X|",
    ];

    for (const spec of TABULAR_SPEC_STRINGS) {
        it(`parses tabular spec string "${spec}"`, () => {
            let parsedSpec = parse(spec).content;
            const ast = parseTabularSpec(parsedSpec);
            expect(tabularPrintRaw(ast)).toEqual(spec);
        });
    }
});
