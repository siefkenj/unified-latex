import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { parse } from "../../unified-latex-util-parse";
import { visit } from "../libs/visit";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-visit", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    it("passes in `inMathMode` context while walking", () => {
        let ast = parse("a $b^{e}$ c");
        let expected = ["b^{e}", "{e}", "e"];
        let received: string[] = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a \\[b^{e}\\] c");
        expected = ["b^{e}", "{e}", "e"];
        received = [];

        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a \\begin{align}b^{e}\\end{align} c");
        expected = ["b^{e}", "{e}", "e"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a $b$ c $d$");
        expected = ["b", "d"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
    });

    it("passes in `inMathMode` context while walking nested structures", () => {
        let ast = parse("a $b\\text{some $math$}$ c");
        let expected = ["b\\text{some $math$}", "math"];
        let received: string[] = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);

        ast = parse("a $b\\text{some $math\\text{deep$x$}$}$ c");
        expected = [
            "b\\text{some $math\\text{deep$x$}$}",
            "math\\text{deep$x$}",
            "x",
        ];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        visit(
            ast,
            (nodes) => {
                received.push(printRaw(nodes));
            },
            {
                test: (node, info) =>
                    Array.isArray(node) && info.context.inMathMode === true,
                includeArrays: true,
            }
        );
        expect(received).toEqual(expected);
    });
});
