import util from "util";
import { strToNodesRaw } from "../../test-common";
import { arg, m } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    replaceStreamingCommand,
    replaceStreamingCommandInGroup,
} from "../libs/replace-streaming-command";
import { joinWithoutExcessWhitespace } from "../libs/utils/join-without-excess-whitespace";
import { replaceStreamingCommandInArray } from "../libs/utils/replace-streaming-command-in-array";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-replace:replace-streaming-command", () => {
    it("joins arrays with whitespace", () => {
        let left = strToNodesRaw("x");
        let right = strToNodesRaw("y");
        joinWithoutExcessWhitespace(left, right);
        expect(left).toEqual(strToNodesRaw("x").concat(strToNodesRaw("y")));

        left = strToNodesRaw("x ");
        right = strToNodesRaw("y");
        joinWithoutExcessWhitespace(left, right);
        expect(left).toEqual(strToNodesRaw("x y"));

        left = strToNodesRaw("x ");
        right = strToNodesRaw(" y");
        joinWithoutExcessWhitespace(left, right);
        expect(left).toEqual(strToNodesRaw("x y"));

        left = strToNodesRaw("x ");
        right = strToNodesRaw(" %\ny");
        joinWithoutExcessWhitespace(left, right);
        expect(left).toEqual(strToNodesRaw("x %\ny"));

        left = strToNodesRaw("x %\n");
        right = strToNodesRaw(" y");
        joinWithoutExcessWhitespace(left, right);
        expect(left).toEqual(strToNodesRaw("x %\ny"));
    });

    it("can replace streaming commands in arrays", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const isReplaceable = match.createMacroMatcher(["foo", "bar"]);
        let nodes: Ast.Node[];

        nodes = strToNodesRaw("\\foo y");
        replaceStreamingCommandInArray(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}");

        nodes = strToNodesRaw("x \\foo y");
        replaceStreamingCommandInArray(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("x \\FOO{y}");

        nodes = strToNodesRaw("x \\bar\\foo y");
        replaceStreamingCommandInArray(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("x \\BAR{\\FOO{y}}");

        nodes = strToNodesRaw("x \\foo%com\n y");
        replaceStreamingCommandInArray(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("x %com\n\\FOO{y}");

        nodes = strToNodesRaw("x \\foo%com\n\\bar y");
        replaceStreamingCommandInArray(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("x %com\n\\FOO{\\BAR{y}}");
    });

    it("can replace streaming commands in groups", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const isReplaceable = match.createMacroMatcher(["foo", "bar"]);
        let group: Ast.Group;
        let nodes: Ast.Node[];

        group = strToNodesRaw("{\\foo }")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("");

        group = strToNodesRaw("{\\foo}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("");

        group = strToNodesRaw("{\\foo y}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}");

        group = strToNodesRaw("{x \\foo y}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("{x \\FOO{y}}");

        group = strToNodesRaw("{\\bar x \\foo y}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\BAR{x \\FOO{y}}");

        group = strToNodesRaw("{%c\n \\foo y}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("%c\n\\FOO{y}");

        group = strToNodesRaw("{x \\foo}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("{x }");

        group = strToNodesRaw("{x\\bar \\foo}")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("{x}");
    });

    it("preserves whitespace when replacing streaming commands in groups", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const isReplaceable = match.createMacroMatcher(["foo", "bar"]);
        let group: Ast.Group;
        let nodes: Ast.Node[];

        group = strToNodesRaw("{x \\foo y }")[0] as Ast.Group;
        nodes = replaceStreamingCommandInGroup(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("{x \\FOO{y} }");
    });

    it("can replace streaming commands", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const isReplaceable = match.createMacroMatcher(["foo", "bar"]);
        let nodes: Ast.Node[];
        let group: Ast.Group;

        nodes = strToNodesRaw("\\foo y");
        replaceStreamingCommand(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}");

        group = strToNodesRaw("{\\foo y}")[0] as Ast.Group;
        nodes = replaceStreamingCommand(group, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}");
    });

    it("avoids special macros (like \\section) when replacing", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const isReplaceable = match.createMacroMatcher(["foo", "bar"]);
        let nodes: Ast.Node[];

        nodes = strToNodesRaw("\\foo y\\section{xx}z");
        nodes = replaceStreamingCommand(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}\\section{xx}\\FOO{z}");

        nodes = strToNodesRaw("\\foo y\\section{xx}");
        nodes = replaceStreamingCommand(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}\\section{xx}");
    });

    it("avoids environments when replacing", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const isReplaceable = match.createMacroMatcher(["foo", "bar"]);
        let nodes: Ast.Node[];

        nodes = strToNodesRaw("\\foo y\\[x\\]z");
        nodes = replaceStreamingCommand(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual("\\FOO{y}\\[x\\]\\FOO{z}");

        nodes = strToNodesRaw("\\foo y\\begin{baz}x\\end{baz}z");
        nodes = replaceStreamingCommand(nodes, isReplaceable, replacer);
        expect(printRaw(nodes)).toEqual(
            "\\FOO{y}\\begin{baz}x\\end{baz}\\FOO{z}"
        );
    });
});
