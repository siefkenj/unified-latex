import util from "util";
import { match } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "../libs/replace-node";
import { arg, s, SP } from "@unified-latex/unified-latex-builder";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { strToNodes } from "../../test-common";
import * as Ast from "@unified-latex/unified-latex-types";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-replace", () => {
    it("can replace nodes", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return s("XX");
            }
        });
        expect(printRaw(nodes)).toEqual("XX b c {XX b} c");
    });

    it("can delete nodes", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return null;
            }
        });
        expect(printRaw(nodes)).toEqual(" b c { b} c");

        nodes = strToNodes("$abc$");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [];
            }
        });
        expect(printRaw(nodes)).toEqual("$bc$");

        nodes = strToNodes("$aabc$");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [];
            }
        });
        expect(printRaw(nodes)).toEqual("$bc$");
    });

    it("can replace with multiple nodes", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [s("x"), s("y")];
            }
        });
        expect(printRaw(nodes)).toEqual("xy b c {xy b} c");
    });

    it("doesn't get stuck in recursive loop when replacement contains replaceable item", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [s("a"), s("a")];
            }
        });
        expect(printRaw(nodes)).toEqual("aa b c {aa b} c");

        nodes = strToNodes("$aa$");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [s("a"), s("a")];
            }
        });
        expect(printRaw(nodes)).toEqual("$aaaa$");
    });

    it("can replace macros", () => {
        let targetAst = strToNodes("\\foo and \\bar");
        let insertNode = strToNodes("\\bar");
        let ast = strToNodes("\\foo and \\raw");
        replaceNode(ast, (node) => {
            if (match.macro(node, "raw")) {
                return insertNode;
            }
        });

        expect(ast).toEqual(targetAst);
    });

    it("can recursively replace in macro args", () => {
        let targetAst = strToNodes("\\emph{X \\emph{X y}}");
        let ast = strToNodes("\\emph{\\emph{y}}");
        replaceNode(ast, (node) => {
            if (match.macro(node, "emph")) {
                // Copy the old node but insert an "X " at the front of its contents.
                // It is important that the contents are copied rather than modified directly.
                const newNode = { ...node } as Ast.Macro;
                const oldArg = JSON.parse(
                    JSON.stringify(node.args![0])
                ) as Ast.Argument;
                oldArg.content.unshift(SP);
                oldArg.content.unshift(s("X"));

                newNode.args = [oldArg];
                return newNode;
            }
        });

        expect(ast).toEqual(targetAst);
    });
});
