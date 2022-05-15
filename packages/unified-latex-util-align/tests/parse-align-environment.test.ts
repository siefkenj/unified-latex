import util from "util";
import { parseAlignEnvironment } from "../libs/parse-align-environment";
import { strToNodes } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-align", () => {
    it("can parse align environment", () => {
        let nodes = strToNodes("a&b");
        expect(parseAlignEnvironment(nodes)).toEqual([
            {
                cells: [
                    [{ content: "a", type: "string" }],
                    [{ content: "b", type: "string" }],
                ],
                colSeps: [{ content: "&", type: "string" }],
                rowSep: null,
                trailingComment: null,
            },
        ]);

        nodes = strToNodes("a&b&c");
        expect(parseAlignEnvironment(nodes)).toEqual([
            {
                cells: [
                    [{ content: "a", type: "string" }],
                    [{ content: "b", type: "string" }],
                    [{ content: "c", type: "string" }],
                ],
                colSeps: [
                    { content: "&", type: "string" },
                    { content: "&", type: "string" },
                ],
                rowSep: null,
                trailingComment: null,
            },
        ]);
        nodes = strToNodes("a&b\\\\&c");
        expect(parseAlignEnvironment(nodes)).toEqual([
            {
                cells: [
                    [{ content: "a", type: "string" }],
                    [{ content: "b", type: "string" }],
                ],
                colSeps: [{ content: "&", type: "string" }],
                rowSep: {
                    args: [
                        {
                            closeMark: "",
                            content: [],
                            openMark: "",
                            type: "argument",
                        },
                        {
                            closeMark: "",
                            content: [],
                            openMark: "",
                            type: "argument",
                        },
                    ],
                    content: "\\",
                    type: "macro",
                },
                trailingComment: null,
            },
            {
                cells: [[], [{ content: "c", type: "string" }]],
                colSeps: [{ content: "&", type: "string" }],
                rowSep: null,
                trailingComment: null,
            },
        ]);
    });
});
