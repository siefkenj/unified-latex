import * as Ast from "@unified-latex/unified-latex-types";
import { reparseMacroNames } from "@unified-latex/unified-latex-util-catcode";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { parseMathMinimal, parseMinimal } from "./parse-minimal";

type Point = { offset: number; line: number; column: number };

/**
 * Where some content starts and ends (as an offset) in the source. Either may be unknown.
 */
export type Bounds = { start?: Point; end?: number };

/**
 * Reparse `nodes` in math mode (`inMathMode === true`) or in text mode.
 *
 * If `source` is the string that `nodes` were parsed from, the text of `nodes` is taken
 * directly from `source`, so it is reproduced exactly and the new nodes have positions
 * that point into `source`.
 *
 * Otherwise (or if `nodes` were modified so that they no longer match `source`), `nodes` are
 * printed with `printRaw` and the new nodes have no positions. This fallback may give
 * the wrong result, since what was parsed in one mode can't always be printed in a way
 * that reparses correctly in the other. For example, arguments attached in text mode
 * (e.g. `\frac` gets the arguments `12` and `+` from `\frac12 + x`) are printed with braces
 * (`\frac{12}{+} x`), so they keep their text-mode grouping, and processed math content is
 * missing the whitespace next to groups, `^`, `_` and `&` (see `trimMathWhitespace`), which
 * matters in text mode.
 *
 * `bounds` is where the content that `nodes` came from starts and ends (e.g., just inside
 * the braces of an argument; see `argumentContentBounds`). It is needed to recover the
 * whitespace at the start and end of the content, and the end of content whose last
 * argument has no position.
 */
export function reparseInMode(
    nodes: Ast.Node[],
    inMathMode: boolean,
    source?: string,
    bounds?: Bounds
): Ast.Node[] {
    if (nodes.length === 0) {
        return nodes;
    }
    // Comments are the same in either mode. A leading comment may be a "same line" comment
    // (e.g. `\begin{matrix}%comment`), which can't be detected once it is separated from
    // what precedes it, so leading comments are kept as they are.
    if (match.comment(nodes[0])) {
        let numComments = 1;
        while (match.comment(nodes[numComments])) {
            numComments++;
        }
        return nodes.slice(0, numComments).concat(
            reparseInMode(nodes.slice(numComments), inMathMode, source, {
                end: bounds?.end,
            })
        );
    }
    const printed = printRaw(nodes);
    let str = printed;
    let start: Point | undefined;
    if (source != null) {
        const span = {
            start: bounds?.start ?? contentStart(nodes),
            end: bounds?.end ?? contentEnd(nodes),
        };
        if (span.start && span.end != null) {
            let slice = source.slice(span.start.offset, span.end);
            let sliceStart = span.start;
            // Whitespace at the start or end of the content may have been removed since it was
            // parsed (e.g., by `unifiedLatexTrimEnvironmentContents`), so only keep it if
            // `nodes` still have it
            if (!isSpace(nodes[0])) {
                const leading = slice.match(/^\s*/)![0];
                slice = slice.slice(leading.length);
                sliceStart = advancePoint(sliceStart, leading);
            }
            const last = nodes[nodes.length - 1];
            if (!isSpace(last)) {
                // A comment ends with a newline, which is kept
                slice = slice.replace(
                    match.comment(last) ? /(?<=\n)\s*$/ : /\s*$/,
                    ""
                );
            }
            // The nodes may have been modified since they were parsed. Only use the original
            // source if it says the same thing as `nodes`. Braces are ignored, since `printRaw`
            // adds braces to shorthand arguments (e.g. `\frac12` is printed as `\frac{1}{2}`).
            if (normalize(slice) === normalize(printed)) {
                str = slice;
                start = sliceStart;
            }
        }
    }

    const reparsed = inMathMode
        ? parseMathMinimal(str)
        : parseMinimal(str).content;

    visit(reparsed, (node) => {
        if (!node.position) {
            return;
        }
        if (start) {
            shiftPoint(node.position.start, start);
            shiftPoint(node.position.end, start);
        } else {
            delete node.position;
        }
    });

    // Macro names may have been reparsed to include characters like `@` (e.g., because of `\makeatletter`).
    // Reparsing from a string undoes this, so redo it.
    const specialNames = macroNamesWithSpecialChars(nodes);
    if (specialNames.size > 0) {
        if (inMathMode) {
            restoreMacroNames(reparsed, specialNames);
        } else {
            const specialChars = new Set(
                Array.from(specialNames).flatMap(
                    (name) => name.match(/[@_:]/g) || []
                )
            );
            reparseMacroNames(reparsed, specialChars);
        }
    }

    return reparsed;
}

/**
 * Join the macros in `nodes` with the strings that follow them to form the macro names in `names`.
 * `reparseMacroNames` can't be used in math mode, since `_` is parsed as a subscript there,
 * which also splits names like `\my_fn:n`.
 */
function restoreMacroNames(nodes: Ast.Node[], names: Set<string>) {
    const isPrefixOfName = (str: string) =>
        Array.from(names).some((name) => name.startsWith(str));
    visit(
        nodes,
        (array) => {
            for (let i = 0; i < array.length; i++) {
                const macro = array[i];
                if (
                    !match.anyMacro(macro) ||
                    !(macro.escapeToken == null || macro.escapeToken === "\\")
                ) {
                    continue;
                }
                // The index of the node after the longest name found
                let nameEnd: number | undefined;
                let name = macro.content;
                for (let j = i + 1; j < array.length; j++) {
                    const next = array[j];
                    if (
                        !match.anyString(next) &&
                        !(match.anyMacro(next) && next.escapeToken === "")
                    ) {
                        break;
                    }
                    name += next.content;
                    if (!isPrefixOfName(name)) {
                        break;
                    }
                    if (names.has(name)) {
                        nameEnd = j + 1;
                    }
                }
                if (nameEnd == null) {
                    continue;
                }
                const joined = array.splice(i + 1, nameEnd - i - 1);
                macro.content += joined
                    .map((node) => (node as Ast.String).content)
                    .join("");
                const end = joined[joined.length - 1].position?.end;
                if (macro.position && end) {
                    macro.position.end = end;
                }
            }
        },
        { includeArrays: true, test: Array.isArray }
    );
}

/**
 * Whether `arg`, an argument of `macro`, is in math mode when `macro` is used in math
 * mode (`inMathMode === true`) or in text mode. An argument's own mode (e.g. from
 * `argumentsInMathMode`) takes precedence over the macro's mode, which takes precedence
 * over the mode the macro is used in.
 */
export function argumentInMathMode(
    arg: Ast.Argument,
    macro: Ast.Macro,
    inMathMode: boolean
): boolean {
    return (
        arg._renderInfo?.inMathMode ??
        macro._renderInfo?.inMathMode ??
        inMathMode
    );
}

/**
 * Use a heuristic to decide whether `nodes` were parsed in math mode. The heuristic
 * looks for strings of length greater than 1 or the failure for "_" and "^" to be parsed
 * as a macro. Content that is in text mode (e.g., the argument of `\text{...}`) is skipped.
 */
export function wasParsedInMathMode(nodes: Ast.Node[]): boolean {
    let parsedInMathMode = true;
    visit(
        nodes,
        (node, info) => {
            // If there are multi-char strings or ^ and _ have been parsed as strings, we know
            // that we were not parsed in math mode.
            if (
                info.context.inMathMode &&
                ((match.anyString(node) && node.content.length > 1) ||
                    match.string(node, "^") ||
                    match.string(node, "_"))
            ) {
                parsedInMathMode = false;
                return EXIT;
            }
        },
        { startingContext: { inMathMode: true, hasMathModeAncestor: true } }
    );
    return parsedInMathMode;
}

/**
 * Use a heuristic to decide whether `nodes` were parsed in text mode. The heuristic looks for
 * "_" and "^" parsed as macros or words split into single characters (in text mode, adjacent
 * letters and digits form a single string). Content that is in math mode (e.g., the
 * argument of `\ensuremath{...}`) is skipped.
 */
export function wasParsedInTextMode(nodes: Ast.Node[]): boolean {
    const isWordChar = (node: Ast.Node | Ast.Argument | undefined) =>
        match.anyString(node) && /^[\p{L}\p{N}]+$/u.test(node.content);
    let parsedInTextMode = true;
    visit(
        nodes,
        (node, info) => {
            if (
                !info.context.inMathMode &&
                ((match.anyMacro(node) &&
                    node.escapeToken === "" &&
                    (node.content === "^" || node.content === "_")) ||
                    (isWordChar(node) &&
                        info.index != null &&
                        isWordChar(info.containingArray?.[info.index + 1])))
            ) {
                parsedInTextMode = false;
                return EXIT;
            }
        },
        { startingContext: { inMathMode: false, hasMathModeAncestor: false } }
    );
    return parsedInTextMode;
}

/**
 * Where the content of `arg` (inside its open and close marks) is in the source, if known.
 */
export function argumentContentBounds(arg: Ast.Argument): Bounds | undefined {
    if (!arg.position) {
        return undefined;
    }
    const { start, end } = arg.position;
    return {
        start: {
            offset: start.offset + arg.openMark.length,
            line: start.line,
            column: start.column + arg.openMark.length,
        },
        end: end.offset - arg.closeMark.length,
    };
}

/**
 * Where the body of `env` ends in the source, if known. It ends where `\end{...}` starts.
 */
export function environmentContentBounds(
    env: Ast.Environment
): Bounds | undefined {
    if (!env.position) {
        return undefined;
    }
    return {
        end: env.position.end.offset - `\\end{${printRaw(env.env)}}`.length,
    };
}

function normalize(str: string) {
    return str.replace(/[\s{}]+/g, "");
}

function isSpace(node: Ast.Node | undefined) {
    return match.whitespace(node) || match.parbreak(node);
}

/**
 * The point that is `str` after `point`.
 */
function advancePoint(point: Point, str: string): Point {
    const lines = str.split("\n");
    const lastLine = lines[lines.length - 1];
    return {
        offset: point.offset + str.length,
        line: point.line + lines.length - 1,
        column:
            lines.length === 1
                ? point.column + str.length
                : lastLine.length + 1,
    };
}

/**
 * The start of the first node in `nodes` (or in their descendants, since the arguments of
 * a macro are not included in its position).
 */
function contentStart(nodes: Ast.Node[]): Point | undefined {
    let start: Point | undefined;
    visit(nodes, (node) => {
        if (
            node.position &&
            (!start || node.position.start.offset < start.offset)
        ) {
            start = node.position.start;
        }
    });
    return start;
}

/**
 * The offset in the source where `nodes` end, `undefined` if no node has a position, or
 * `null` if it cannot be determined.
 */
function contentEnd(nodes: Ast.Node[]): number | undefined | null {
    let end: number | undefined;
    for (const node of nodes) {
        const thisEnd = nodeEnd(node);
        if (thisEnd === null) {
            return null;
        }
        if (thisEnd != null && (end == null || thisEnd > end)) {
            end = thisEnd;
        }
    }
    return end;
}

/**
 * The offset in the source where `node` ends, including the arguments of a macro (which are
 * not included in its position). `null` if it cannot be determined.
 */
function nodeEnd(node: Ast.Node): number | undefined | null {
    let end = node.position?.end.offset;
    if (!match.anyMacro(node)) {
        return end;
    }
    for (const arg of node.args || []) {
        let argEnd: number | undefined | null;
        if (arg.position) {
            argEnd = arg.position.end.offset;
        } else if (arg.openMark || arg.closeMark) {
            // E.g., a shorthand argument like the `2` in `\frac12`, whose braces are not in the
            // source, or an "until" argument, whose close mark comes after its content
            argEnd = null;
        } else if (arg.content.length > 0) {
            // E.g., a star
            argEnd = contentEnd(arg.content) ?? null;
        }
        if (argEnd === null) {
            return null;
        }
        if (argEnd != null && (end == null || argEnd > end)) {
            end = argEnd;
        }
    }
    return end;
}

/**
 * Shift `point`, which is relative to the start of a substring, so that it is relative
 * to the string that the substring starts at `origin` in.
 */
function shiftPoint(point: Point, origin: Point) {
    if (point.line === 1) {
        point.column += origin.column - 1;
    }
    point.line += origin.line - 1;
    point.offset += origin.offset;
}

/**
 * Find the macro names in `nodes` that use characters that are not normally allowed in macro
 * names (but are allowed when using `\makeatletter` or `\ExplSyntaxOn`).
 */
function macroNamesWithSpecialChars(nodes: Ast.Node[]): Set<string> {
    const names = new Set<string>();
    visit(nodes, (node) => {
        if (
            match.anyMacro(node) &&
            (node.escapeToken == null || node.escapeToken === "\\") &&
            node.content.length > 1 &&
            /[@_:]/.test(node.content)
        ) {
            names.add(node.content);
        }
    });
    return names;
}
