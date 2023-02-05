import { ArgSpecPegParser as PegParser } from "@unified-latex/unified-latex-util-pegjs";
import * as ArgSpec from "./argspec-types";

/**
 * Produce a string containing any decorators for the argspec node.
 * For example, `!` in front of a node means "don't accept leading whitespace"
 */
function getDecorators(node: ArgSpec.Node): string {
    let ret = "";
    if ((node as ArgSpec.LeadingWhitespace).noLeadingWhitespace) {
        ret += "!";
    }
    return ret;
}

/**
 * Print an `xparse` argument specification AST
 * to a string.
 */
export function printRaw(node: ArgSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    const decorators = getDecorators(node);
    const defaultArg = (node as ArgSpec.DefaultArgument).defaultArg
        ? printRaw((node as ArgSpec.DefaultArgument).defaultArg)
        : "";
    let spec = decorators;

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
            return spec + defaultArg;
        case "mandatory":
            // {...} is the default enclosure for mandatory arguments
            if (node.openBrace === "{" && node.closeBrace === "}") {
                spec += "m";
            } else {
                spec += node.defaultArg ? "R" : "r";
                spec += node.openBrace + node.closeBrace;
            }
            return spec + defaultArg;
        case "embellishment":
            spec += node.defaultArg ? "E" : "e";
            return (
                spec +
                "{" +
                printRaw(node.embellishmentTokens) +
                "}" +
                defaultArg
            );
        case "verbatim":
            return spec + "v" + node.openBrace;
        case "group":
            return spec + "{" + printRaw(node.content) + "}";
        case "until": {
            const stopTokens = printRaw(node.stopTokens);
            return stopTokens.length > 1 || stopTokens[0] === " "
                ? `u{${stopTokens}}`
                : `u${stopTokens}`;
        }
        default:
            const neverType: never = type;
            console.warn(`Unknown node type "${neverType}" for node`, node);
            return "";
    }
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
