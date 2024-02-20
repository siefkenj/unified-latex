import { describe, expect, it } from "vitest";
import util from "util";
import type * as Ast from "@unified-latex/unified-latex-types";
import { attachMacroArgs } from "../libs/attach-arguments";
import { strToNodes } from "../../test-common";
import { arg, s, SP } from "@unified-latex/unified-latex-builder";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    it("Default arguments are stored if provided and no argument given", () => {
        let nodes = strToNodes(`\\xxx`);
        attachMacroArgs(nodes, {
            xxx: {
                signature: "O{x}",
            },
        });
        expect(nodes).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                        _renderInfo: { defaultArg: "x" },
                    },
                ],
            },
        ]);

        nodes = strToNodes(`\\xxx`);
        attachMacroArgs(nodes, {
            xxx: {
                signature: "D(){x}",
            },
        });
        expect(nodes).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                        _renderInfo: { defaultArg: "x" },
                    },
                ],
            },
        ]);

        nodes = strToNodes(`\\xxx`);
        attachMacroArgs(nodes, {
            xxx: {
                signature: "E{_}{x}",
            },
        });
        expect(nodes).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                        _renderInfo: { defaultArg: "x" },
                    },
                ],
            },
        ]);
    });
    it("Embellishment arguments keep track of their defaults", () => {
        let nodes = strToNodes(`\\xxx_{a}`);
        attachMacroArgs(nodes, {
            xxx: {
                signature: "E{_^}{xy}",
            },
        });
        expect(nodes).toEqual([
            {
                args: [
                    {
                        closeMark: "",
                        content: [
                            {
                                content: "a",
                                type: "string",
                            },
                        ],
                        openMark: "_",
                        type: "argument",
                    },
                    {
                        _renderInfo: {
                            defaultArg: "y",
                        },
                        closeMark: "",
                        content: [],
                        openMark: "",
                        type: "argument",
                    },
                ],
                content: "xxx",
                type: "macro",
            },
        ]);
    });
});
