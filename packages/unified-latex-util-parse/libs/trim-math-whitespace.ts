import * as Ast from "@unified-latex/unified-latex-types";
import {
    EnvInfoRecord,
    MacroInfoRecord,
} from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * The mode some content is in. The mode is `"unknown"` if the content may be an argument of
 * a macro (or the body of an environment) that isn't known, so it may be in either mode.
 */
type Mode = "math" | "text" | "unknown";

/**
 * In math mode, the parser keeps the whitespace next to groups, `&`, `^` and `_` but marks it
 * as droppable, since it isn't known yet whether the content is really in math mode (e.g.,
 * the argument of `\text{...}` is not). Remove the marked whitespace from content that is in
 * math mode, and unmark it everywhere else. Whitespace in content whose mode is unknown (e.g.,
 * the argument of an unknown macro used in math mode) is kept.
 *
 * `tree` should already have its macro arguments attached using `macros` and `environments`,
 * so that the mode of all content can be determined. `inMathMode` is the mode `tree` is in.
 */
export function trimMathWhitespace(
    tree: Ast.Ast,
    {
        macros,
        environments,
        inMathMode = false,
    }: {
        macros: MacroInfoRecord;
        environments: EnvInfoRecord;
        inMathMode?: boolean;
    }
) {
    const isKnownMacro = (node: Ast.Macro) =>
        Object.prototype.hasOwnProperty.call(macros, node.content);
    const envInfo = (node: Ast.Environment) => {
        const name = printRaw(node.env);
        return Object.prototype.hasOwnProperty.call(environments, name)
            ? environments[name]
            : undefined;
    };

    /**
     * Find the groups in `nodes` that may be arguments of unknown macros (whose arguments
     * aren't attached) and the nodes inside of what may be their optional arguments.
     */
    const findPossibleArguments = (nodes: Ast.Node[]) => {
        const groups = new Set<Ast.Node>();
        const inOptionalArgs = new Set<Ast.Node>();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!match.anyMacro(node) || node.args || isKnownMacro(node)) {
                continue;
            }
            let j = i + 1;
            while (j < nodes.length) {
                const next = nodes[j];
                if (
                    match.whitespace(next) ||
                    match.comment(next) ||
                    (j === i + 1 && match.string(next, "*"))
                ) {
                    j++;
                } else if (match.group(next)) {
                    groups.add(next);
                    j++;
                } else if (match.string(next, "[")) {
                    const close = findClosingBracket(nodes, j);
                    if (close == null) {
                        break;
                    }
                    for (const inside of nodes.slice(j + 1, close)) {
                        inOptionalArgs.add(inside);
                        if (match.group(inside)) {
                            groups.add(inside);
                        }
                    }
                    j = close + 1;
                } else {
                    break;
                }
            }
            i = j - 1;
        }
        return { groups, inOptionalArgs };
    };

    const walkArray = (nodes: Ast.Node[], mode: Mode) => {
        const { groups, inOptionalArgs } =
            mode === "math"
                ? findPossibleArguments(nodes)
                : { groups: new Set(), inOptionalArgs: new Set() };
        let numKept = 0;
        for (const node of nodes) {
            if (isDroppableInMath(node)) {
                if (mode === "math" && !inOptionalArgs.has(node)) {
                    continue;
                }
                unmark(node);
            }
            nodes[numKept++] = node;
        }
        nodes.length = numKept;
        for (const node of nodes) {
            walkNode(node, groups.has(node) ? "unknown" : mode);
        }
    };

    const walkNode = (node: Ast.Ast, mode: Mode) => {
        if (Array.isArray(node)) {
            walkArray(node, mode);
            return;
        }
        if (match.math(node)) {
            walkArray(node.content, "math");
            return;
        }
        if (match.anyEnvironment(node)) {
            // The arguments of an environment are never in math mode
            for (const arg of node.args || []) {
                walkArray(arg.content, "text");
            }
            let contentMode: Mode;
            if (node.type === "mathenv") {
                contentMode = "math";
            } else {
                // The mode recorded when the body was processed takes precedence (e.g., the
                // body of an unknown environment used in math mode is reparsed in math mode)
                const info = envInfo(node);
                contentMode = modeOf(
                    node._renderInfo?.inMathMode ??
                        info?.renderInfo?.inMathMode,
                    info || mode !== "math" ? mode : "unknown"
                );
            }
            walkArray(node.content, contentMode);
            return;
        }
        if (match.anyMacro(node)) {
            const macroMode = modeOf(node._renderInfo?.inMathMode, mode);
            for (const arg of node.args || []) {
                walkArray(
                    arg.content,
                    modeOf(arg._renderInfo?.inMathMode, macroMode)
                );
            }
            return;
        }
        if (node.type === "root" || node.type === "group") {
            walkArray(node.content, mode);
        }
    };

    walkNode(tree, inMathMode ? "math" : "text");
}

function modeOf(inMathMode: unknown, fallback: Mode): Mode {
    if (inMathMode === true) {
        return "math";
    }
    if (inMathMode === false) {
        return "text";
    }
    return fallback;
}

function isDroppableInMath(node: Ast.Node): node is Ast.Whitespace {
    return (
        match.whitespace(node) && node._renderInfo?.droppableInMath === true
    );
}

function unmark(node: Ast.Whitespace) {
    const { droppableInMath, ...rest } = node._renderInfo || {};
    if (Object.keys(rest).length > 0) {
        node._renderInfo = rest;
    } else {
        delete node._renderInfo;
    }
}

/**
 * The index of the `]` that closes the `[` at `start`, if there is one.
 */
function findClosingBracket(nodes: Ast.Node[], start: number) {
    let depth = 0;
    for (let i = start; i < nodes.length; i++) {
        if (match.string(nodes[i], "[")) {
            depth++;
        } else if (match.string(nodes[i], "]")) {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return undefined;
}
