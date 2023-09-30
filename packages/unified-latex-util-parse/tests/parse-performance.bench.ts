import { describe, it, expect, bench } from "vitest";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import * as Ast from "@unified-latex/unified-latex-types";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";
import { parseMinimal } from "../libs/parse-minimal";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-parse", () => {
    bench(
        "\\newcommand{foo}{\\begin{x}} doesn't cause enormous slowdown",
        () => {
            let value = `\\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            \\newcommand\\bels{\\begin{x}}
            `;
            parseMinimal(value);
        }
    );
});
