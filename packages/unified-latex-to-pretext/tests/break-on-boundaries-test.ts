import { describe, it, expect } from "vitest";
import util from "util";
import { getParser } from "@unified-latex/unified-latex-util-parse";
import { report_macros, expand_user_macros } from "../libs/report-and-expand-macros";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:break-on-boundaries", () => {
   
});