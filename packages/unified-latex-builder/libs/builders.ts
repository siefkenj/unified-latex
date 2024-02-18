import type * as Ast from "@unified-latex/unified-latex-types";

type CoercibleNode = string | Ast.Node;
type CoercibleArgument = null | CoercibleNode | Ast.Argument;
type MacroSpecialOptions = {
    escapeToken?: string;
};
type ArgumentsSpecialOptions = {
    braces?: string;
    defaultOpenMark?: string;
    defaultCloseMark?: string;
};
type ArgumentSpecialOptions = {
    braces?: string;
    openMark?: string;
    closeMark?: string;
};

function normalizeNode(node: CoercibleNode): Ast.Node {
    if (typeof node === "string") {
        return s(node);
    }
    return node;
}

function normalizeArgument(
    arg: CoercibleArgument,
    openMark = "{",
    closeMark = "}"
): Ast.Argument {
    if (arg == null) {
        return { type: "argument", content: [], openMark: "", closeMark: "" };
    }
    if (typeof arg === "string") {
        return {
            type: "argument",
            openMark,
            closeMark,
            content: [s(arg)],
        };
    }
    if (arg.type === "argument") {
        return arg;
    }
    return { type: "argument", openMark, closeMark, content: [arg] };
}

function normalizeArgumentsList(
    args?: CoercibleArgument | CoercibleArgument[],
    openMark = "{",
    closeMark = "}"
): Ast.Argument[] {
    if (args == null) {
        return [];
    }
    if (Array.isArray(args)) {
        return args.map((arg) => normalizeArgument(arg, openMark, closeMark));
    }
    return [normalizeArgument(args, openMark, closeMark)];
}

type BracesPair = { openMark: string; closeMark: string };
const BRACES_MAP: Record<string, BracesPair> = {
    "*": { openMark: "", closeMark: "" },
    "{": { openMark: "{", closeMark: "}" },
    "[": { openMark: "[", closeMark: "]" },
    "(": { openMark: "(", closeMark: ")" },
    "<": { openMark: "<", closeMark: ">" },
};
const CLOSE_BRACES = new Set(
    Object.values(BRACES_MAP)
        .map((x) => x.closeMark)
        .filter((x) => x)
);

/**
 * Turn a braces signature into an array of braces.
 */
function bracesToOpenAndCloseMarks(braces: string): BracesPair[] {
    const ret: BracesPair[] = [];

    for (const char of braces.split("")) {
        if (CLOSE_BRACES.has(char)) {
            continue;
        }
        const braces = BRACES_MAP[char];
        if (braces == null) {
            throw new Error(`Unknown open/close mark type "${char}"`);
        }
        braces;
        ret.push(braces);
    }

    return ret;
}

/**
 * Create an Argument list. `special.braces` can optionally specify
 * the signature of the open/close marks that each argument uses. For example
 * ```
 * args(["a", "b"], { braces: "[]{}" });
 * ```
 * will result in arguments `[a]{b}`. Valid braces are `*`, `[`, `{`, `(`, and `<`.
 *
 * `null` may be passed as the value of an empty optional argument. If `null` is passed,
 * the `openBrace` and `closeBrace` of the argument will be set to empty strings and the
 * contents will be set to an empty array. For example,
 * ```
 * args([null, "b"], { braces: "[]{}" });
 * ```
 * will produce the same structure as if the the first "optional argument" were omitted in regular parsing.
 */
export function args(
    args: CoercibleArgument | CoercibleArgument[],
    special?: ArgumentsSpecialOptions
): Ast.Argument[] {
    if (!Array.isArray(args)) {
        args = [args];
    }
    if (special?.braces) {
        const braces = bracesToOpenAndCloseMarks(special.braces);
        if (braces.length !== args.length) {
            throw new Error(
                `There is a difference between the number of supplied braces and the number of supplied arguments. ${args.length} supplied with braces signature ${special.braces}`
            );
        }
        return args.map((arg, i) =>
            normalizeArgument(arg, braces[i].openMark, braces[i].closeMark)
        );
    }

    const openMark = special?.defaultOpenMark ?? "{";
    const closeMark = special?.defaultCloseMark ?? "}";
    return normalizeArgumentsList(args, openMark, closeMark);
}

/**
 * Create an Argument. `special.braces` can optionally specify
 * the signature of the open/close marks that each argument uses. For example
 * ```
 * arg("a", { braces: "[]" });
 * ```
 * will result in arguments `[a]`. Valid braces are `*`, `[`, `{`, `<`, and `(`.
 *
 * `null` may be passed as the value of an empty optional argument. If `null` is passed,
 * the `openBrace` and `closeBrace` of the argument will be set to empty strings and the
 * contents will be set to an empty array. For example,
 * ```
 * args([null, "b"], { braces: "[]{}" });
 * ```
 * will produce the same structure as if the the first "optional argument" were omitted in regular parsing.
 */
export function arg(
    args: CoercibleArgument | Ast.Node[],
    special?: ArgumentSpecialOptions
): Ast.Argument {
    if (args == null) {
        return { type: "argument", content: [], openMark: "", closeMark: "" };
    }
    if (typeof args === "string") {
        args = s(args);
    }
    if (!Array.isArray(args) && args.type === "argument") {
        return args;
    }

    let openMark = special?.openMark ?? "{";
    let closeMark = special?.closeMark ?? "}";
    if (special?.braces) {
        const braces = bracesToOpenAndCloseMarks(special.braces);
        if (braces[0]) {
            openMark = braces[0].openMark;
            closeMark = braces[0].closeMark;
        }
    }

    if (!Array.isArray(args)) {
        args = [args];
    }

    return { type: "argument", content: args, openMark, closeMark };
}

/**
 * Creates an empty argument. This can only present in Ast as a result of -NoValue-.
 */
export function emptyArg() {
    return arg([], {
        openMark: "",
        closeMark: "",
    });
}

/**
 * Create a Macro with the given `name`. The macro
 * may be followed by any number of arguments.
 */
export function m(
    name: string,
    marcoArgs?: CoercibleArgument | CoercibleArgument[],
    special?: MacroSpecialOptions
): Ast.Macro {
    const args = normalizeArgumentsList(marcoArgs);
    const escapeToken = special?.escapeToken;
    const ret: Ast.Macro = { type: "macro", content: name };

    if (args.length > 0) {
        ret.args = args;
    }
    if (escapeToken != null) {
        ret.escapeToken = escapeToken;
    }

    return ret;
}

/**
 * Create a String node from `value`
 */
export function s(value: string | Ast.String): Ast.String {
    if (typeof value === "string") {
        return { type: "string", content: value };
    }
    return value;
}

/**
 * Create an Environment node.
 */
export function env(
    name: string,
    body: CoercibleNode | CoercibleNode[],
    envArgs?: CoercibleArgument | CoercibleArgument[],
    special?: unknown
): Ast.Environment {
    if (!Array.isArray(body)) {
        body = [body];
    }
    const args = normalizeArgumentsList(envArgs, "[", "]");
    const ret: Ast.Environment = {
        type: "environment",
        env: name,
        content: body.map(normalizeNode),
    };
    if (args.length > 0) {
        ret.args = args;
    }

    return ret;
}

/**
 * Whitespace node.
 */
export const SP: Ast.Whitespace = { type: "whitespace" };
