import util from "util";
import * as Ast from "../../unified-latex-types";
import { attachMacroArgs } from "../libs/attach-arguments";
import { getArgsContent } from "../libs/get-args-content";
import { strToNodes } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {

    it("can get args content", () => {
        // Recursively apply substitutions in groups
        let nodes = strToNodes("\\xxx b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        let args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([[{ type: "string", content: "b" }]]);

        nodes = strToNodes("\\xxx b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "s m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([null, [{ type: "string", content: "b" }]]);

        nodes = strToNodes("\\xxx*b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "s m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([
            [{ type: "string", content: "*" }],
            [{ type: "string", content: "b" }],
        ]);

        nodes = strToNodes("\\xxx b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([null, [{ type: "string", content: "b" }]]);

        nodes = strToNodes("\\xxx[]{b}");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([[], [{ type: "string", content: "b" }]]);
    });
});
