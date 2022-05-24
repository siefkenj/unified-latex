import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { strToNodes } from "../../test-common";
import { listNewcommands } from "../libs/list-newcommands";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

function normalizeCommands(
    commands: ReturnType<typeof listNewcommands>
): { body: string; name: string; signature: string }[] {
    return commands.map((c) => ({
        body: printRaw(c.body),
        name: c.name,
        signature: c.signature,
    }));
}

describe("unified-latex-utils-macros", () => {
    it("Can list newly defined commands", () => {
        let ast = strToNodes(
            "\\newcommand{\\foo}[2]{bar}\\NewDocumentCommand{mom}{o m}{dad}"
        );

        expect(normalizeCommands(listNewcommands(ast))).toEqual([
            {
                body: "bar",
                name: "foo",
                signature: "m m",
            },
            {
                body: "dad",
                name: "mom",
                signature: "o m",
            },
        ]);
    });

    it("Can list new commands defined with special characters", () => {
        let ast = strToNodes(
            "\\newcommand{\\foo@baz}{bar}\\NewDocumentCommand{foo_bar}{}{baz}"
        );

        expect(normalizeCommands(listNewcommands(ast))).toEqual([
            {
                body: "bar",
                name: "foo@baz",
                signature: "",
            },
            {
                body: "baz",
                name: "foo_bar",
                signature: "",
            },
        ]);
    });
    it("trims whitespace around defined command", () => {
        let ast = strToNodes("\\newcommand{ xxx }{bar}");

        expect(normalizeCommands(listNewcommands(ast))).toEqual([
            {
                name: "xxx",
                body: "bar",
                signature: "",
            },
        ]);
    });
});
