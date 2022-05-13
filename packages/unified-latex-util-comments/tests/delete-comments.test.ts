import util from "util";
import * as Ast from "../../unified-latex-types";
import { printRaw } from "../../unified-latex-util-print-raw";
import { deleteComments } from "../libs/delete-comments";
import { strToNodes } from "../../test-common";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-comments", () => {

    it("can delete comments", () => {
        let nodes = strToNodes("a%\nb%xx\nc");
        deleteComments(nodes);
        expect(printRaw(nodes)).toEqual("abc");

        nodes = strToNodes("%xx");
        deleteComments(nodes);
        expect(printRaw(nodes)).toEqual("");

        nodes = strToNodes("a%xx");
        deleteComments(nodes);
        expect(printRaw(nodes)).toEqual("a");

        nodes = strToNodes("%xx\nb");
        deleteComments(nodes);
        expect(printRaw(nodes)).toEqual("b");
    });

    it("preserves whitespace when deleting comments", () => {
        let nodes = strToNodes("a %\nb %xx\nc");
        deleteComments(nodes);
        expect(printRaw(nodes)).toEqual("a b c");
    });
});
