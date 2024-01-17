import { ArgSpecPegParser as PegParser } from "@unified-latex/unified-latex-util-pegjs";
import * as ArgSpec from "./argspec-types";

/**
 * Produce a string containing any decorators for the argspec node.
 * For example, `!` in front of a node means "don't accept leading whitespace"
 */
function getDecorators(node: ArgSpec.Node): string {
    let ret = "";
    if (node.noLeadingWhitespace) {
        ret += "!";
    }
    return ret;
}

/**
 * Print an `xparse` argument specification AST
 * to a string.
 */
export function printRaw(
    node: ArgSpec.Node | string | (ArgSpec.Node | string)[],
    root = false
): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }
    return printRawInner(node);
}
function printRawInner(node: ArgSpec.Node) {
    const decorators = getDecorators(node);
    let spec = decorators;
    function appendDefaultArg() {
        if ("defaultArg" in node && node.defaultArg) {
            spec = appendTokenOrGroup(spec, node.defaultArg);
        }
    }
    function appendCollection(collection: string[]) {
        spec += printTokenOrCollection(collection);
    }
    const type = node.type;
    switch (type) {
        case "body":
            return decorators + "b";
        case "optionalStar":
            return decorators + "s";
        case "optionalToken":
            return spec + "t" + node.token;
        case "optional":
            // [...] is the default enclosure for optional arguments
            if (node.openBrace === "[" && node.closeBrace === "]") {
                spec += node.defaultArg ? "O" : "o";
            } else {
                spec += node.defaultArg ? "D" : "d";
                spec += node.openBrace + node.closeBrace;
            }
            appendDefaultArg();
            return spec;
        case "mandatory":
            // {...} is the default enclosure for mandatory arguments
            if (node.openBrace === "{" && node.closeBrace === "}") {
                spec += "m";
            } else {
                spec += node.defaultArg ? "R" : "r";
                spec += node.openBrace + node.closeBrace;
            }
            appendDefaultArg();
            return spec;
        case "embellishment":
            spec += node.embellishmentDefaultArg ? "E" : "e";
            appendCollection(node.embellishmentTokens);
            if (node.embellishmentDefaultArg) {
                appendCollection(node.embellishmentDefaultArg);
            }
            return spec;
        case "verbatim":
            return spec + "v" + node.openBrace;
        case "until": {
            spec += "u";
            appendCollection(node.stopTokens);
            return spec;
        }
        default:
            const neverType: never = type;
            console.warn(`Unknown node type "${neverType}" for node`, node);
            return "";
    }
}
/**
 * See xparse-argspec.pegjs - token_or_group is parsed to an array of strings.
 * This function will reconstruct a representative in an inverse image of token_or_group
 * for a given array of strings, and append it to a given string.
 * In order to avoid parsing ambiguity, we force enclose the representative with braces in some case.
 * For instance, if the given string ends with a control word such as "\asdf", and if the representative is a
 * whitespace where we are in a circumstance where no whitespaces are allowed.
 */
function appendTokenOrGroup(
    existingString: string,
    tokenOrGroup: string,
    allowWhitespace = false
) {
    // If a previous token consists of more than one chars and ends with letters,
    // then we need to separate the next token by enclosing it with braces.
    // This can happen with control words such as \asdf.
    const followsControlWord = /\\[a-zA-Z]+$/.test(existingString);
    if (
        (!followsControlWord &&
            tokenOrGroup.length === 1 &&
            (allowWhitespace || tokenOrGroup !== " ")) ||
        tokenOrGroup.startsWith("\\")
    ) {
        return existingString + tokenOrGroup;
    }
    // In normalization, prefer whitespace because it occupies less space.
    return (
        existingString +
        (allowWhitespace && tokenOrGroup.length === 1
            ? " " + tokenOrGroup
            : "{" + tokenOrGroup + "}")
    );
}
/**
 * See xparse-argspec.pegjs, token_or_collection is used by embellishment tokens, embellishment default arguments,
 * and stop tokens for `until`.
 */
function printTokenOrCollection(tokenOrCollection: string[]) {
    if (tokenOrCollection.length <= 1) {
        const token = tokenOrCollection[0];
        if (token.length === 1 && token !== " ") {
            return token;
        }
    }
    let out = "";
    for (let token of tokenOrCollection) {
        out = appendTokenOrGroup(out, token, true);
    }
    return "{" + out + "}";
}

const parseCache: { [argStr: string]: ArgSpec.Node[] } = {};

/**
 * Parse an `xparse` argument specification string to an AST.
 * This function caches results. Don't mutate the returned AST!
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parse(str = ""): ArgSpec.Node[] {
    parseCache[str] = parseCache[str] || PegParser.parse(str);
    return parseCache[str];
}
