import { describe, it, expect } from "vitest";
import util from "util";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { unified } from "unified";
import { getParser, parse } from "../libs/parse";
import { parseMath } from "../libs/parse-math";
import { parseMathMinimal } from "../libs/parse-minimal";
import { unifiedLatexFromString } from "../libs/plugin-from-string";
import { unifiedLatexReparseMath } from "../libs/reparse-math";
import { unifiedLatexFromStringMinimal } from "../libs/plugin-from-string-minimal";
import { withCtanInfo } from "../libs/ctan-info";
import {
    processMacrosAndEnvironments,
    unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse,
} from "../libs/process-macros-and-environments";
import { attachMacroArgs } from "@unified-latex/unified-latex-util-arguments";
import { processEnvironments } from "@unified-latex/unified-latex-util-environments";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

/**
 * Render nodes as a compact outline so that the tokenization (which differs between
 * math mode and text mode) is visible in a test assertion. Strings are JSON-quoted,
 * so `"ab"` is one string node while `"a" "b"` is two. Macro arguments are wrapped in
 * their open/close marks.
 */
function outline(
    nodes: Ast.Node | Ast.Argument | (Ast.Node | Ast.Argument)[]
): string {
    if (Array.isArray(nodes)) {
        return nodes.map(outline).join(" ");
    }
    const node = nodes;
    switch (node.type) {
        case "string":
            return JSON.stringify(node.content);
        case "whitespace":
            return "_";
        case "parbreak":
            return "¶";
        case "comment":
            return `%${node.content}`;
        case "macro": {
            const name = `${node.escapeToken ?? "\\"}${node.content}`;
            return name + (node.args || []).map(outline).join("");
        }
        case "argument":
            if (!node.openMark && node.content.length === 0) {
                return "";
            }
            return `${node.openMark}${outline(node.content)}${node.closeMark}`;
        case "group":
            return `group(${outline(node.content)})`;
        case "inlinemath":
        case "displaymath":
            return `${node.type}(${outline(node.content)})`;
        case "environment":
        case "mathenv":
            return `${node.type}:${printRaw(node.env)}${(node.args || [])
                .map(outline)
                .join("")}(${outline(node.content)})`;
        default:
            return node.type;
    }
}

const outlineOf = (str: string) => outline(parse(str).content);

const { macros: allMacroInfo, environments: allEnvInfo } = withCtanInfo();

/**
 * Parse `str` without passing the source to the plugins, so reparsing has to work from
 * the nodes alone.
 */
function parseWithoutSource(str: string): Ast.Root {
    const processor = unified()
        .use(unifiedLatexFromStringMinimal)
        .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
            macros: allMacroInfo,
            environments: allEnvInfo,
        });
    return processor.runSync(processor.parse(str)) as Ast.Root;
}

/**
 * Parse `value` and then run `unifiedLatexReparseMath` on it. If `withSource` is false,
 * the source is not passed to the plugins.
 */
function parseAndReparseMath(
    value: string,
    options: { mathMacros: string[]; mathEnvs: string[] },
    withSource = true
): Ast.Root {
    const processor = unified()
        .use(unifiedLatexFromString, { macros: { foo: { signature: "m" } } })
        .use(unifiedLatexReparseMath, options);
    const tree = processor.parse(value);
    return processor.runSync(
        tree,
        withSource ? ({ value } as any) : undefined
    ) as Ast.Root;
}

/**
 * The outline of the content of the last argument of the first `\name` in `ast`.
 */
function argOutline(ast: Ast.Ast, name: string): string {
    let content: Ast.Node[] | undefined;
    visit(ast, (node) => {
        if (!content && match.macro(node, name)) {
            content = node.args?.[node.args.length - 1]?.content;
        }
    });
    if (!content) {
        throw new Error(`No argument of \\${name} found`);
    }
    return outline(content);
}

/**
 * The outline of the content of the first node of type `type` in `ast`.
 */
function contentOutline(ast: Ast.Ast, type: string): string {
    let content: Ast.Node[] | undefined;
    visit(ast, (node) => {
        if (!content && (node as Ast.Node).type === type) {
            content = (node as Ast.InlineMath).content;
        }
    });
    if (!content) {
        throw new Error(`No ${type} found`);
    }
    return outline(content);
}

/**
 * Find nodes whose tokenization doesn't match the mode that `visit` reports for them: strings
 * of more than one character in math mode, or `^`/`_` parsed as macros in text mode.
 */
function modeInconsistencies(ast: Ast.Ast): string[] {
    const problems: string[] = [];
    visit(ast, (node, info) => {
        if (info.context.inMathMode) {
            if (match.anyString(node) && node.content.length > 1) {
                problems.push(`"${node.content}" in math mode`);
            }
        } else if (
            match.macro(node) &&
            node.escapeToken === "" &&
            (node.content === "^" || node.content === "_")
        ) {
            problems.push(`${node.content} in text mode`);
        }
    });
    return problems;
}

/**
 * Content that has been hard to reparse in another mode: whitespace next to groups (which
 * is removed from math content), whitespace at the start or end, shorthand arguments, macros
 * whose arguments are in a different mode, comments, etc.
 */
const FRAGMENTS = [
    "a {b} c",
    " a {b} ",
    "{b} c",
    "a {b}\n",
    "a_b c^2",
    "\\frac12 x",
    "\\label{a_b} c^2",
    "\\text{a b} c",
    "%c\n x",
    "x \\sqrt[3]{x} ",
    "\\mbox{a_b}{c}",
];

/**
 * Fragments that `unifiedLatexReparseMath` only reparses correctly when the source is available,
 * since arguments attached in text mode (e.g. `\frac` gets `12` and `x`) keep their grouping when
 * printed.
 */
const FRAGMENTS_NEEDING_SOURCE = new Set(["\\frac12 x"]);

describe("unified-latex-util-parse math mode", () => {
    describe("groups inside math are parsed in math mode", () => {
        it("parses `_` and `^` inside a group (#114)", () => {
            expect(outlineOf("${a_b}$")).toEqual(
                'inlinemath(group("a" _{"b"}))'
            );
            expect(outlineOf("$a_{b_{c}}$")).toEqual(
                'inlinemath("a" _{"b" _{"c"}})'
            );
            expect(outlineOf("$x^{y^{z}}$")).toEqual(
                'inlinemath("x" ^{"y" ^{"z"}})'
            );
        });

        it("gives shorthand fractions in an argument two arguments (#133)", () => {
            expect(outlineOf("$\\frac{\\frac12}{a}$")).toEqual(
                'inlinemath(\\frac{\\frac{"1"}{"2"}}{"a"})'
            );
            expect(outlineOf("$\\sqrt{\\frac12}$")).toEqual(
                'inlinemath(\\sqrt{\\frac{"1"}{"2"}})'
            );
            expect(outlineOf("$\\boxed{\\frac12}$")).toEqual(
                'inlinemath(\\boxed{\\frac{"1"}{"2"}})'
            );
            expect(outlineOf("$\\int_{\\frac12x}$")).toEqual(
                'inlinemath(\\int _{\\frac{"1"}{"2"} "x"})'
            );
        });

        it("parses the arguments of mode-preserving macros in math mode (#53)", () => {
            expect(outlineOf("$\\phantom{\\frac 12}$")).toEqual(
                'inlinemath(\\phantom{\\frac{"1"}{"2"}})'
            );
            expect(outlineOf("$\\hphantom{x_1}\\vphantom{x^2}$")).toEqual(
                'inlinemath(\\hphantom{"x" _{"1"}} \\vphantom{"x" ^{"2"}})'
            );
        });

        it("parses the argument of `\\operatorname` in math mode", () => {
            expect(outlineOf("$\\operatorname{sin}$")).toEqual(
                'inlinemath(\\operatorname{"s" "i" "n"})'
            );
            expect(outlineOf("$\\operatorname{\\frac12 x}$")).toEqual(
                'inlinemath(\\operatorname{\\frac{"1"}{"2"} _ "x"})'
            );
        });

        it("parses the body of `\\textcolor` in math mode but its color in text mode (#132)", () => {
            expect(outlineOf("$\\textcolor{blue}{\\sum_{i=1}^n i}$")).toEqual(
                'inlinemath(\\textcolor{"blue"}{\\sum _{"i" "=" "1"} ^{"n"} _ "i"})'
            );
        });

        it("parses `alignat` as a math environment", () => {
            expect(
                outlineOf("\\begin{alignat}{2}a&=b_1\\end{alignat}")
            ).toEqual('mathenv:alignat{"2"}("a" "&" "=" "b" _{"1"})');
            expect(
                outlineOf("\\begin{alignat*}{2}a&=b_1\\end{alignat*}")
            ).toEqual('mathenv:alignat*{"2"}("a" "&" "=" "b" _{"1"})');
        });

        it("parses environments opened inside math in math mode", () => {
            expect(
                outlineOf("\\[\\begin{array}{cc} a_1 & b\\end{array}\\]")
            ).toEqual(
                'displaymath(environment:array{"cc"}("a" _{"1"} "&" "b"))'
            );
        });
    });

    describe("whitespace inside math", () => {
        it("removes the whitespace next to groups, `&`, `^` and `_` in math mode", () => {
            expect(outlineOf("$a {b} & c ^ d _ e f$")).toEqual(
                'inlinemath("a" group("b") "&" "c" ^{"d"} _{"e"} _ "f")'
            );
            expect(outlineOf("$\\frac{a {b} c}{d}$")).toEqual(
                'inlinemath(\\frac{"a" group("b") "c"}{"d"})'
            );
            expect(
                outlineOf("\\[\\begin{pmatrix} a & {b} \\end{pmatrix}\\]")
            ).toEqual('displaymath(environment:pmatrix("a" "&" group("b")))');
        });

        it("removes the whitespace in the arguments of custom macros that are known", () => {
            const parser = getParser({ macros: { note: { signature: "m" } } });
            expect(printRaw(parser.parse("$x \\note{see {it} now}$"))).toEqual(
                "$x \\note{see{it}now}$"
            );
        });

        it("keeps the whitespace in the arguments of unknown macros, which may be in text mode", () => {
            const STRINGS = [
                "$x \\note{see \\emph{here} now}$",
                "$x \\note{see {\\bf here} now}$",
                "$x \\note{if $y$ is {big} enough}$",
                "\\[x \\note{a {b} c}{d {e} f}\\]",
                "$x \\note*[a {b} c]{d {e} f}$",
            ];
            for (const str of STRINGS) {
                expect(printRaw(parse(str))).toEqual(str);
            }
        });

        it("keeps the whitespace in the bodies of unknown environments", () => {
            expect(
                printRaw(parse("$\\begin{myenv}a {b} c\\end{myenv}$"))
            ).toEqual("$\\begin{myenv}a {b} c\\end{myenv}$");
            // The body may be in text mode, so it isn't recorded to be in math mode
            const env = (
                parse("$\\begin{myenv}a ^ b\\end{myenv}$")
                    .content[0] as Ast.InlineMath
            ).content[0] as Ast.Environment;
            expect(printRaw(env)).toEqual("\\begin{myenv}a ^{b}\\end{myenv}");
            expect(env._renderInfo?.inMathMode).toBeUndefined();
        });

        it("marks the whitespace when parsing minimally, and leaves no marks once processed", () => {
            expect(parseMathMinimal("a {b}").filter(match.whitespace)).toEqual([
                {
                    type: "whitespace",
                    position: expect.anything(),
                    _renderInfo: { droppableInMath: true },
                },
            ]);

            let marked = 0;
            visit(parse("$a {b} \\note{c {d} e}$ \\[ f ^ g \\]"), (node) => {
                if (node._renderInfo?.droppableInMath) {
                    marked++;
                }
            });
            expect(marked).toEqual(0);
        });
    });

    describe("text-mode macros inside math are parsed in text mode", () => {
        it("parses `\\text` and friends in text mode", () => {
            expect(outlineOf("$\\text{a_b c}$")).toEqual(
                'inlinemath(\\text{"a_b" _ "c"})'
            );
            expect(outlineOf("$\\mbox{file_name}\\textbf{x^2}$")).toEqual(
                'inlinemath(\\mbox{"file_name"} \\textbf{"x^2"})'
            );
        });

        it("parses `\\text` in text mode inside math environments", () => {
            expect(
                outlineOf("\\begin{equation}\\text{a_b}\\end{equation}")
            ).toEqual('mathenv:equation(\\text{"a_b"})');
            expect(
                outlineOf("\\begin{align}x&=\\text{a_b}\\end{align}")
            ).toEqual('mathenv:align("x" "&" "=" \\text{"a_b"})');
        });

        it("parses `\\tag` and `\\intertext` in text mode", () => {
            expect(
                outlineOf("\\begin{equation}x\\tag{a_b}\\end{equation}")
            ).toEqual('mathenv:equation("x" \\tag{"a_b"})');
            expect(
                outlineOf("\\begin{equation}x\\tag*{a_b}\\end{equation}")
            ).toEqual('mathenv:equation("x" \\tag"*"{"a_b"})');
            expect(
                outlineOf(
                    "\\begin{align}a\\\\\\intertext{so $x_1$}\\shortintertext{or_}b\\end{align}"
                )
            ).toEqual(
                'mathenv:align("a" \\\\ \\intertext{"so" _ inlinemath("x" _{"1"})} \\shortintertext{"or_"} "b")'
            );
        });

        it("round-trips text containing `_` inside math", () => {
            for (const str of [
                "$\\text{\\url{my_url}}$",
                "$\\mbox{file_name.tex}$",
                "$x*\\text{foo}$",
                "$\\text{a_b c}$",
            ]) {
                expect(printRaw(parse(str))).toEqual(str);
            }
        });

        it("parses reference keys, file names and links in text mode", () => {
            for (const str of [
                "$\\cite{smith_2020}$",
                "$\\cite[p.~2]{smith_2020}$",
                "$\\includegraphics{my_file.png}$",
                "$\\input{my_file}\\include{my_file}$",
                "$\\cpageref{eq:a_b}\\Cpageref{eq:a_b}$",
                "$\\crefrange{eq:a_b}{eq:c_d}\\Crefrange{eq:a_b}{eq:c_d}$",
                "$\\namecref{eq:a_b}\\nameCref{eq:a_b}\\lcnamecref{eq:a_b}$",
                "$\\labelcref{eq:a_b}\\labelcpageref{eq:a_b}$",
                "$\\autopageref{eq:a_b}\\nolinkurl{a_b}$",
                "$\\hyperlink{a_b}{c}\\hypertarget{a_b}{c}\\hyperref[a_b]{c}$",
                "$\\index{a_b}$",
                "$\\nameref{sec:a_b}\\Nameref{sec:a_b}$",
                "$\\citep{smith_2020}\\citet[p.~2]{smith_2020}$",
                "$\\autocite{smith_2020}\\parencite[see][p.~2]{smith_2020}$",
            ]) {
                expect(printRaw(parse(str))).toEqual(str);
            }
        });

        it("parses the command of `\\tikz` in text mode", () => {
            for (const str of [
                "$\\tikz \\draw (0,0) circle (1) node {a_b};$",
                "$\\tikz{\\draw (0,0) circle (1) node {a_b};} x$",
            ]) {
                const strings: string[] = [];
                visit(parse(str), (node) => {
                    if (match.anyString(node)) {
                        strings.push(node.content);
                    }
                });
                expect(strings).toContain("circle");
                expect(strings).toContain("a_b");
            }
        });

        it("parses math nested in text nested in math", () => {
            expect(outlineOf("$x_{y_{\\text{hello there $p_q_r$}}}$")).toEqual(
                'inlinemath("x" _{"y" _{\\text{"hello" _ "there" _ inlinemath("p" _{"q"} _{"r"})}}})'
            );
            expect(outlineOf("$\\text{a $\\text{b_c $d_e$}$}$")).toEqual(
                'inlinemath(\\text{"a" _ inlinemath(\\text{"b_c" _ inlinemath("d" _{"e"})})})'
            );
        });

        it("keeps identifier-like arguments as words", () => {
            expect(
                outlineOf("$x\\label{eq:ab}\\hspace{1em}\\color{red}$")
            ).toEqual(
                'inlinemath("x" \\label{"eq" ":" "ab"} \\hspace{"1em"} \\color{"red"})'
            );
        });

        it("parses text-mode macros in text mode when parsing starts in math mode", () => {
            expect(outline(parseMath("\\text{a_b}+x_1"))).toEqual(
                '\\text{"a_b"} "+" "x" _{"1"}'
            );
        });

        it("parses the bodies of text environments in text mode", () => {
            expect(outlineOf("$\\begin{tabular}{c}a_b\\end{tabular}$")).toEqual(
                'inlinemath(environment:tabular{"c"}("a_b"))'
            );
            expect(
                outlineOf("$\\begin{minipage}{1in}a_b\\end{minipage}$")
            ).toEqual('inlinemath(environment:minipage{"1in"}("a_b"))');
        });

        it("parses the link text of `\\href` in the surrounding mode", () => {
            expect(outlineOf("$\\href{u}{x^2}$")).toEqual(
                'inlinemath(\\href{"u"}{"x" ^{"2"}})'
            );
        });

        it("recognizes inline math in the arguments of unknown macros", () => {
            let numInlineMath = 0;
            visit(parse("$\\foo{for $x$}$"), (node) => {
                if (node.type === "inlinemath") {
                    numInlineMath++;
                }
            });
            expect(numInlineMath).toEqual(2);
        });

        it("doesn't let a `$` in a group start inline math that doesn't close in the group", () => {
            expect(outlineOf("${a $ b} $")).toEqual(
                'inlinemath(group("a" _ "$" _ "b"))'
            );
            expect(outlineOf("$\\frac{a $ b}{c}$")).toEqual(
                'inlinemath(\\frac{"a" _ "$" _ "b"}{"c"})'
            );
        });
    });

    describe("math-mode macros and environments inside text are parsed in math mode", () => {
        it("parses math macros used in text", () => {
            expect(outlineOf("\\ensuremath{a_b}")).toEqual(
                '\\ensuremath{"a" _{"b"}}'
            );
            expect(outlineOf("\\ensuremath{\\frac12}")).toEqual(
                '\\ensuremath{\\frac{"1"}{"2"}}'
            );
            expect(outlineOf("\\ensuremath{x\\text{a_b}}")).toEqual(
                '\\ensuremath{"x" \\text{"a_b"}}'
            );
        });

        it("parses math environments used in text", () => {
            expect(outlineOf("\\begin{pmatrix}a_1&b\\end{pmatrix}")).toEqual(
                'environment:pmatrix("a" _{"1"} "&" "b")'
            );
        });

        it("parses `eqnarray` as a math environment", () => {
            expect(
                outlineOf("\\begin{eqnarray}a_1&=&b\\end{eqnarray}")
            ).toEqual('mathenv:eqnarray("a" _{"1"} "&" "=" "&" "b")');
            expect(
                outlineOf("\\begin{eqnarray*}a_1&=&b\\end{eqnarray*}")
            ).toEqual('mathenv:eqnarray*("a" _{"1"} "&" "=" "&" "b")');
        });

        it("parses only the body of `\\mathmakebox` in math mode", () => {
            expect(outlineOf("\\mathmakebox[2em][l]{a_b}")).toEqual(
                '\\mathmakebox["2em"]["l"]{"a" _{"b"}}'
            );
        });
    });

    describe("custom macros and environments", () => {
        it("parses the arguments of custom math macros and environments in math mode", () => {
            const parser = getParser({
                macros: {
                    mymath: {
                        signature: "m",
                        renderInfo: { inMathMode: true },
                    },
                    mytext: {
                        signature: "m",
                        renderInfo: { inMathMode: false },
                    },
                },
                environments: { myeq: { renderInfo: { inMathMode: true } } },
            });
            const outlineOfCustom = (str: string) =>
                outline(parser.parse(str).content);

            expect(outlineOfCustom("\\mymath{a_b\\text{c_d}}")).toEqual(
                '\\mymath{"a" _{"b"} \\text{"c_d"}}'
            );
            expect(outlineOfCustom("$\\mytext{c_d}$")).toEqual(
                'inlinemath(\\mytext{"c_d"})'
            );
            expect(outlineOfCustom("\\begin{myeq}\\frac12\\end{myeq}")).toEqual(
                'environment:myeq(\\frac{"1"}{"2"})'
            );
        });

        it("parses the arguments of unknown macros in the mode they are used in", () => {
            const parser = getParser({ macros: { foo: { signature: "m" } } });
            expect(
                outline(parser.parse("$\\foo{a_b}$ \\foo{a_b}").content)
            ).toEqual('inlinemath(\\foo{"a" _{"b"}}) _ \\foo{"a_b"}');
        });

        it("reparses macros that are only known to be math after parsing with `unifiedLatexReparseMath`", () => {
            const value = "\\foo{\\frac12 a_b}";
            const processor = unified()
                .use(unifiedLatexFromString, {
                    macros: { foo: { signature: "m" } },
                })
                .use(unifiedLatexReparseMath, {
                    mathMacros: ["foo"],
                    mathEnvs: [],
                });
            const tree = processor.runSync(processor.parse(value), {
                value,
            } as any) as Ast.Root;
            // Arguments are attached the same way as when parsing in math mode
            expect(outline(tree.content)).toEqual(
                '\\foo{\\frac{"1"}{"2"} _ "a" _{"b"}}'
            );
            const a = (tree.content[0] as Ast.Macro).args![0].content.find(
                (node) => match.string(node, "a")
            )!;
            expect(a.position?.start.offset).toEqual(value.lastIndexOf("a"));
        });

        it("keeps arguments attached to macros that `unifiedLatexReparseMath` doesn't know about", () => {
            const processor = unified()
                .use(unifiedLatexFromString, {
                    macros: { foo: { signature: "m" } },
                })
                .use(unifiedLatexReparseMath, {
                    mathMacros: ["mymath"],
                    mathEnvs: ["myeq"],
                });
            for (const value of [
                "\\mymath{\\foo{x}}",
                "\\begin{myeq}\\foo{x}\\end{myeq}",
            ]) {
                const tree = processor.runSync(processor.parse(value), {
                    value,
                } as any) as Ast.Root;
                expect(argOutline(tree, "foo")).toEqual('"x"');
            }
        });

        it("doesn't reparse content when the tree is processed again", () => {
            const value =
                "\\begin{aligned}\\mymac{x}\\end{aligned} $\\text{\\mymac{y}}$ \\[\\begin{pmatrix}\\mymac{z}\\end{pmatrix}\\]";
            const parser = getParser({
                macros: { mymac: { signature: "m" } },
            });
            const tree = parser.parse(value);
            const expected = outline(tree.content);
            // Without `mymac`, its arguments would be lost if they were reparsed
            processMacrosAndEnvironments(tree, {
                macros: allMacroInfo,
                environments: allEnvInfo,
                source: value,
            });
            expect(outline(tree.content)).toEqual(expected);
            expect(expected).toContain('\\mymac{"z"}');
        });

        it("reparses math arguments that were attached before processing", () => {
            const value = "\\ensuremath{x^2}";
            const tree = unified()
                .use(unifiedLatexFromStringMinimal)
                .parse(value);
            attachMacroArgs(tree, allMacroInfo);
            processMacrosAndEnvironments(tree, {
                macros: allMacroInfo,
                environments: allEnvInfo,
                source: value,
            });
            expect(outline(tree.content)).toEqual(outlineOf(value));
        });

        it("reparses math environments whose mode was recorded without reparsing", () => {
            const value = "\\begin{cases}x^2\\end{cases}";
            const tree = unified()
                .use(unifiedLatexFromStringMinimal)
                .parse(value);
            processEnvironments(tree, allEnvInfo);
            processMacrosAndEnvironments(tree, {
                macros: allMacroInfo,
                environments: allEnvInfo,
                source: value,
            });
            expect(outline(tree.content)).toEqual(outlineOf(value));
        });

        describe("`unifiedLatexReparseMath`", () => {
            const reparseMath = (
                value: string,
                options: { mathMacros: string[]; mathEnvs: string[] }
            ) => {
                const processor = unified()
                    .use(unifiedLatexFromString, {
                        macros: { foo: { signature: "m" } },
                    })
                    .use(unifiedLatexReparseMath, options);
                return processor.runSync(processor.parse(value), {
                    value,
                } as any) as Ast.Root;
            };

            it("keeps the closing brace of a trailing macro argument", () => {
                for (const value of [
                    "\\foo{\\frac{1}{2}}",
                    "\\foo{x \\mbox{b}}",
                    "\\foo{\\frac{1}{}}",
                    "\\foo{\\sqrt[3]{x}}",
                ]) {
                    const tree = reparseMath(value, {
                        mathMacros: ["foo"],
                        mathEnvs: [],
                    });
                    expect(printRaw(tree)).toEqual(value);
                }
                const value = "\\begin{myeq}a \\mbox{b}\\end{myeq}";
                const tree = reparseMath(value, {
                    mathMacros: [],
                    mathEnvs: ["myeq"],
                });
                expect(printRaw(tree)).toEqual(value);
            });

            it("doesn't reparse from the source if the content was changed after parsing", () => {
                const value = "\\foo{x^{ab}}";
                const processor = unified()
                    .use(unifiedLatexFromString, {
                        macros: { foo: { signature: "m" } },
                    })
                    .use(function renameX() {
                        return (tree: Ast.Root) => {
                            const arg = (tree.content[0] as Ast.Macro).args![0];
                            arg.content = arg.content.map((node) =>
                                // `x^` is a single string in text mode
                                match.string(node, "x^")
                                    ? { ...node, content: "y^" }
                                    : node
                            );
                        };
                    })
                    .use(unifiedLatexReparseMath, {
                        mathMacros: ["foo"],
                        mathEnvs: [],
                    });
                const tree = processor.runSync(processor.parse(value), {
                    value,
                } as any) as Ast.Root;
                expect(outline(tree.content)).toEqual('\\foo{"y" ^{"a" "b"}}');
            });

            it("leaves arguments that are explicitly in text mode alone", () => {
                const value = "\\foo{a_b}{c_d}";
                const processor = unified()
                    .use(unifiedLatexFromString, {
                        macros: {
                            foo: {
                                signature: "m m",
                                renderInfo: {
                                    argumentsInMathMode: [false, null],
                                },
                            },
                        },
                    })
                    .use(unifiedLatexReparseMath, {
                        mathMacros: ["foo"],
                        mathEnvs: [],
                    });
                const tree = processor.runSync(processor.parse(value), {
                    value,
                } as any) as Ast.Root;
                expect(outline(tree.content)).toEqual(
                    '\\foo{"a_b"}{"c" _{"d"}}'
                );
            });

            it("doesn't restore whitespace trimmed from the ends of an environment body", () => {
                for (const [value, expected] of [
                    [
                        "\\begin{foo}\n  a b \n\\end{foo}",
                        "\\begin{foo}a b\\end{foo}",
                    ],
                    [
                        "\\begin{foo}a %c\n  \n\n\\end{foo}",
                        "\\begin{foo}a %c\n\\end{foo}",
                    ],
                ]) {
                    const tree = reparseMath(value, {
                        mathMacros: [],
                        mathEnvs: ["foo"],
                    });
                    expect(printRaw(tree)).toEqual(expected);
                }
            });

            it("removes the whitespace in the bodies of environments that are now known to be math", () => {
                const value = "$\\begin{myenv}a ^ b\\end{myenv}$";
                const tree = reparseMath(value, {
                    mathMacros: [],
                    mathEnvs: ["myenv"],
                });
                expect(printRaw(tree)).toEqual(
                    "$\\begin{myenv}a^{b}\\end{myenv}$"
                );
            });

            it("reparses the bodies of environments that were parsed minimally", () => {
                const value = "$\\begin{foo}x {y}\\end{foo}$";
                const processor = unified()
                    .use(unifiedLatexFromStringMinimal)
                    .use(unifiedLatexReparseMath, {
                        mathMacros: [],
                        mathEnvs: ["foo"],
                    });
                const tree = processor.runSync(processor.parse(value), {
                    value,
                } as any) as Ast.Root;
                expect(printRaw(tree)).toEqual("$\\begin{foo}x{y}\\end{foo}$");
            });

            it("keeps the arguments of custom macros in environments that have arguments", () => {
                // The `{cc}` is in text mode, so it doesn't mean the body was parsed in text mode
                const tree = reparseMath(
                    "\\begin{equation}\\begin{array}{cc}\\foo{x}\\end{array}\\end{equation}",
                    { mathMacros: [], mathEnvs: ["equation"] }
                );
                expect(argOutline(tree, "foo")).toEqual('"x"');
            });

            it("keeps arguments that were attached with a different signature", () => {
                const value = "\\foo{\\cite{a}{b}}";
                const processor = unified()
                    .use(unifiedLatexFromString, {
                        macros: {
                            foo: { signature: "m" },
                            cite: { signature: "m m" },
                        },
                    })
                    .use(unifiedLatexReparseMath, {
                        mathMacros: ["foo"],
                        mathEnvs: [],
                    });
                const tree = processor.runSync(processor.parse(value), {
                    value,
                } as any) as Ast.Root;
                expect(outline(tree.content)).toEqual(
                    '\\foo{\\cite{"a"}{"b"}}'
                );
            });

            it("leaves the content of a tree parsed in math mode alone", () => {
                const processor = unified()
                    .use(unifiedLatexFromString, {
                        mode: "math",
                        macros: { foo: { signature: "m" } },
                    })
                    .use(unifiedLatexReparseMath, {
                        mathMacros: ["foo"],
                        mathEnvs: [],
                    });
                // Without the source, reparsed nodes have no positions
                const tree = processor.runSync(
                    processor.parse("\\foo{x}")
                ) as Ast.Root;
                const x = (tree.content[0] as Ast.Macro).args![0].content[0];
                expect(x.position).toBeDefined();
            });

            it("leaves content that is already in math mode alone", () => {
                const tree = reparseMath(
                    "\\begin{matrix}\\frac{1}{2} & b\\end{matrix} \\ensuremath{\\frac12 x} $\\foo{\\frac12}$",
                    { mathMacros: ["ensuremath", "foo"], mathEnvs: ["matrix"] }
                );
                expect(outline(tree.content)).toEqual(
                    'environment:matrix(\\frac{"1"}{"2"} "&" "b") _ \\ensuremath{\\frac{"1"}{"2"} _ "x"} _ inlinemath(\\foo{\\frac{"1"}{"2"}})'
                );
            });
        });
    });

    describe("reparsed content", () => {
        it("keeps positions that point into the original source", () => {
            for (const src of [
                "Some text \\ensuremath{a_b}",
                "$x + \\text{ab_c}$",
                "$x\n+\\text{\nab_c}$",
                "\\[\\begin{array}{c}\n  a_1\\end{array}\\]",
            ]) {
                visit(parse(src), (node) => {
                    if (!match.anyString(node) || !node.position) {
                        return;
                    }
                    const { start, end } = node.position;
                    expect(src.slice(start.offset, end.offset)).toEqual(
                        node.content
                    );
                    const lines = src.slice(0, start.offset).split("\n");
                    expect(start.line).toEqual(lines.length);
                    expect(start.column).toEqual(
                        lines[lines.length - 1].length + 1
                    );
                });
            }
        });

        it("keeps whitespace in text reparsed from math when the source is not available", () => {
            const value = "$\\text{a {b} c^ d}$";
            const processor = unified()
                .use(unifiedLatexFromStringMinimal)
                .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
                    macros: allMacroInfo,
                    environments: allEnvInfo,
                });
            // No file is passed, so the plugin can't see the source
            const tree = processor.runSync(processor.parse(value));
            expect(printRaw(tree)).toEqual(value);
        });

        it("keeps comments that start on the same line as the environment", () => {
            const env = parse("\\begin{pmatrix}%xx\na_1\\end{pmatrix}")
                .content[0] as Ast.Environment;
            expect(outline(env.content)).toEqual('%xx "a" _{"1"}');
            expect(env.content[0]).toMatchObject({
                type: "comment",
                sameline: true,
            });
        });

        it("keeps macro names containing `@` or `_` when reparsing", () => {
            const atLetterParser = getParser({ flags: { atLetter: true } });
            expect(
                outline(atLetterParser.parse("$\\text{\\my@macro x}$").content)
            ).toEqual('inlinemath(\\text{\\my@macro _ "x"})');

            expect(
                outlineOf("\\makeatletter $\\text{\\my@macro x}$ \\makeatother")
            ).toEqual(
                '\\makeatletter _ inlinemath(\\text{\\my@macro _ "x"}) _ \\makeatother'
            );
        });

        it("keeps expl3 macro names when reparsing in math mode", () => {
            expect(
                outlineOf(
                    "\\ExplSyntaxOn\\begin{matrix}\\my_fn:n x\\end{matrix}\\ExplSyntaxOff"
                )
            ).toEqual(
                '\\ExplSyntaxOn environment:matrix(\\my_fn:n _ "x") \\ExplSyntaxOff'
            );
        });

        it("keeps parbreaks in text reparsed from math when the source is not available", () => {
            const tree = parseWithoutSource("$\\mbox{a\n\nb}$");
            expect(outline(tree.content)).toEqual(
                'inlinemath(\\mbox{"a" ¶ "b"})'
            );
        });
    });

    describe("visit context", () => {
        it("reports the mode of each macro argument", () => {
            const ast = parse("$\\textcolor{blue}{x}\\text{y}$");
            const modes: Record<string, boolean | undefined> = {};
            visit(ast, (node, info) => {
                if (match.anyString(node)) {
                    modes[node.content] = info.context.inMathMode;
                }
            });
            expect(modes).toEqual({ blue: false, x: true, y: false });
        });

        it("reports the arguments of environments as text", () => {
            const ast = parse("\\[\\begin{array}{cc} x\\end{array}\\]");
            const modes: Record<string, boolean | undefined> = {};
            visit(ast, (node, info) => {
                if (match.anyString(node)) {
                    modes[node.content] = info.context.inMathMode;
                }
            });
            expect(modes).toEqual({ cc: false, x: true });
        });

        it("reports the mode of the text of a link", () => {
            expect(outlineOf("$\\hyperlink{a_b}{x_1}$")).toEqual(
                'inlinemath(\\hyperlink{"a_b"}{"x" _{"1"}})'
            );
            expect(outlineOf("$\\hyperref[a_b]{x_1}$")).toEqual(
                'inlinemath(\\hyperref["a_b"]{"x" _{"1"}})'
            );
        });
    });

    // Reparsed content must come out the same as content that was parsed in the right mode
    // in the first place, whatever the content is and (except for `FRAGMENTS_NEEDING_SOURCE`)
    // whether or not the source is available.
    describe("reparsing gives the same result as parsing in the right mode", () => {
        it.each([...FRAGMENTS, "$y_1$ z", "a $y_1$"])(
            "text inside math: %j",
            (fragment) => {
                const expected = argOutline(
                    parse(`\\text{${fragment}}`),
                    "text"
                );
                const src = `$\\text{${fragment}}$`;
                expect(argOutline(parse(src), "text")).toEqual(expected);
                expect(argOutline(parseWithoutSource(src), "text")).toEqual(
                    expected
                );
                expect(modeInconsistencies(parse(src))).toEqual([]);
            }
        );

        it.each(FRAGMENTS)("math inside text: %j", (fragment) => {
            // A group in math keeps leading whitespace, but inline math doesn't
            const expected = argOutline(
                parse(`$\\ensuremath{${fragment}}$`),
                "ensuremath"
            );
            const src = `\\ensuremath{${fragment}}`;
            expect(argOutline(parse(src), "ensuremath")).toEqual(expected);
            expect(argOutline(parseWithoutSource(src), "ensuremath")).toEqual(
                expected
            );
            expect(modeInconsistencies(parse(src))).toEqual([]);
        });

        it.each(FRAGMENTS)(
            "environments reparsed by `unifiedLatexReparseMath`: %j",
            (fragment) => {
                const expected = contentOutline(
                    parse(`\\begin{equation}${fragment}\\end{equation}`),
                    "mathenv"
                );
                const src = `\\begin{foo}${fragment}\\end{foo}`;
                for (const withSource of FRAGMENTS_NEEDING_SOURCE.has(fragment)
                    ? [true]
                    : [true, false]) {
                    const tree = parseAndReparseMath(
                        src,
                        { mathMacros: [], mathEnvs: ["foo"] },
                        withSource
                    );
                    expect(contentOutline(tree, "environment")).toEqual(
                        expected
                    );
                    expect(modeInconsistencies(tree)).toEqual([]);
                }
            }
        );

        it.each(FRAGMENTS)(
            "macro arguments reparsed by `unifiedLatexReparseMath`: %j",
            (fragment) => {
                const expected = argOutline(
                    parse(`$\\ensuremath{${fragment}}$`),
                    "ensuremath"
                );
                const src = `\\foo{${fragment}}`;
                for (const withSource of FRAGMENTS_NEEDING_SOURCE.has(fragment)
                    ? [true]
                    : [true, false]) {
                    const tree = parseAndReparseMath(
                        src,
                        { mathMacros: ["foo"], mathEnvs: [] },
                        withSource
                    );
                    expect(argOutline(tree, "foo")).toEqual(expected);
                    expect(modeInconsistencies(tree)).toEqual([]);
                }
            }
        );
    });

    describe("macros whose arguments are text", () => {
        // Groups inside math are parsed in math mode, so every macro that takes text must
        // be marked as such. Add a row here when adding such a macro.
        it.each([
            "\\text{a_b c}",
            "\\textbf{a_b c}",
            "\\textsuperscript{a_b c}",
            "\\textsubscript{a_b c}",
            "\\hbox{a_b c}",
            "\\vbox{a_b c}",
            "\\vtop{a_b c}",
            "\\mbox{a_b c}",
            "\\fbox{a_b c}",
            "\\framebox[1in]{a_b c}",
            "\\makebox[1in][l]{a_b c}",
            "\\parbox{1in}{a_b c}",
            "\\raisebox{1pt}{a_b c}",
            "\\colorbox{red}{a_b c}",
            "\\rotatebox{90}{a_b c}",
            "\\scalebox{2}{a_b c}",
            "\\reflectbox{a_b c}",
            "\\resizebox{1in}{!}{a_b c}",
            "\\sbox{\\x}{a_b c}",
            "\\savebox{\\x}{a_b c}",
            "\\label{a_b c}",
            "\\ref{a_b c}",
            "\\eqref{a_b c}",
            "\\cite{a_b c}",
            "\\url{a_b c}",
            "\\href{a_b c}{x}",
            "\\includegraphics{a_b c}",
            "\\tag{a_b c}",
        ])("parses the text in %s in text mode", (macro) => {
            const src = `$${macro}$`;
            const ast = parse(src);
            const strings: string[] = [];
            visit(ast, (node) => {
                if (match.anyString(node)) {
                    strings.push(node.content);
                }
            });
            expect(strings).toContain("a_b");
            expect(printRaw(ast)).toEqual(src);
            expect(modeInconsistencies(ast)).toEqual([]);
        });

        it("does not take a box specification as the content of a TeX box", () => {
            for (const src of [
                "\\hbox to 1in{a b}",
                "$\\hbox to 1in{a b}$",
                "\\vbox spread 1pt{a b}",
            ]) {
                expect(printRaw(parse(src))).toEqual(src);
            }
        });

        it("parses the content of a TeX box with a box specification in text mode", () => {
            for (const src of [
                "$\\hbox to 1in{the sin}$",
                "$\\vbox spread \\hsize{the sin}$",
            ]) {
                const ast = parse(src);
                expect(argOutline(ast, src.slice(2, 6))).toEqual(
                    '"the" _ "sin"'
                );
                expect(modeInconsistencies(ast)).toEqual([]);
            }
        });

        it("declares the mode of every text and box macro", () => {
            const undeclared: string[] = [];
            for (const [name, info] of Object.entries(allMacroInfo)) {
                if (
                    !(info.signature || info.argumentParser) ||
                    !/^text|box$/.test(name)
                ) {
                    continue;
                }
                if (
                    info.renderInfo?.inMathMode == null &&
                    info.renderInfo?.argumentsInMathMode == null
                ) {
                    undeclared.push(name);
                }
            }
            expect(undeclared).toEqual([]);
        });
    });

    describe("argument positions", () => {
        it("records the position of arguments, including their braces", () => {
            for (const [src, expected] of [
                ["\\textbf{ab} \\section[a b]{c}", ["{ab}", "[a b]", "{c}"]],
                [
                    "$\\frac{1}{ 2 }\\sqrt[3]{x}$",
                    ["{1}", "{ 2 }", "[3]", "{x}"],
                ],
                ["\\cite[p.~2]{a_b}", ["[p.~2]", "{a_b}"]],
                // Shorthand arguments have no braces in the source, so no position
                ["$\\frac12$", []],
            ] as const) {
                const args: string[] = [];
                visit(parse(src), (node) => {
                    if (node.type === "argument" && node.position) {
                        const { start, end } = node.position;
                        args.push(src.slice(start.offset, end.offset));
                    }
                });
                expect(args).toEqual(expected);
            }
        });
    });
});
