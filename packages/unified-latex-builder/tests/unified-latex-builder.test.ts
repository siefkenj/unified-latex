import util from "util";
import { args, env, m, s, SP } from "..";

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-builder", () => {
    it("can build macro", () => {
        expect(m("foo")).toEqual({ type: "macro", content: "foo" });

        expect(m("foo", "bar")).toEqual({
            type: "macro",
            content: "foo",
            args: [
                {
                    type: "argument",
                    openMark: "{",
                    closeMark: "}",
                    content: [{ type: "string", content: "bar" }],
                },
            ],
        });

        expect(m("foo", ["bar", "baz"])).toEqual({
            type: "macro",
            content: "foo",
            args: [
                {
                    type: "argument",
                    openMark: "{",
                    closeMark: "}",
                    content: [{ type: "string", content: "bar" }],
                },
                {
                    type: "argument",
                    openMark: "{",
                    closeMark: "}",
                    content: [{ type: "string", content: "baz" }],
                },
            ],
        });

        expect(m("foo", [], { escapeToken: "" })).toEqual({
            type: "macro",
            content: "foo",
            escapeToken: "",
        });
    });

    it("can build environment", () => {
        expect(env("foo", [])).toEqual({
            type: "environment",
            env: "foo",
            content: [],
        });
        expect(env("foo", ["bar", "baz"])).toEqual({
            type: "environment",
            env: "foo",
            content: [
                { type: "string", content: "bar" },
                { type: "string", content: "baz" },
            ],
        });
        expect(env("foo", "fun", "faz")).toEqual({
            type: "environment",
            env: "foo",
            content: [{ type: "string", content: "fun" }],
            args: [
                {
                    type: "argument",
                    openMark: "[",
                    closeMark: "]",
                    content: [{ type: "string", content: "faz" }],
                },
            ],
        });
    });

    it("can build string", () => {
        expect(s("foo")).toEqual({ type: "string", content: "foo" });
    });

    it("can build arguments", () => {
        expect(args("a")).toEqual([
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "a" }],
            },
        ]);
        expect(args(["a", "b"])).toEqual([
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "a" }],
            },
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "b" }],
            },
        ]);
        expect(args(["a", "b"], { braces: "[]{}" })).toEqual([
            {
                type: "argument",
                openMark: "[",
                closeMark: "]",
                content: [{ type: "string", content: "a" }],
            },
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "b" }],
            },
        ]);
        expect(args(["*", "b"], { braces: "*[]" })).toEqual([
            {
                type: "argument",
                openMark: "",
                closeMark: "",
                content: [{ type: "string", content: "*" }],
            },
            {
                type: "argument",
                openMark: "[",
                closeMark: "]",
                content: [{ type: "string", content: "b" }],
            },
        ]);
    });

    it("can supply pre-processed arguments", () => {
        expect(m("foo", args(["bar", "baz"], { braces: "[]{}" }))).toEqual({
            type: "macro",
            content: "foo",
            args: [
                {
                    type: "argument",
                    openMark: "[",
                    closeMark: "]",
                    content: [{ type: "string", content: "bar" }],
                },
                {
                    type: "argument",
                    openMark: "{",
                    closeMark: "}",
                    content: [{ type: "string", content: "baz" }],
                },
            ],
        });
    });
});
