import * as Ast from "@unified-latex/unified-latex-types";
import unicodeLigatures from "./ligature-macros.json";
import { match } from "@unified-latex/unified-latex-util-match";

function makeString(content: string): Ast.String {
    return { type: "string", content };
}

const mappedLigatures: [string, Ast.String][] = unicodeLigatures.map(
    ([macro, str]) => [macro, makeString(str)]
);

const SUBSTITUTION_MAP: Map<string, Ast.String> = new Map([
    // We cannot use the basic lookup to replace a `\ ` macro, since it
    // may be confused with a macro that has no arguments. We will replace this
    // macro manually.
    //["\\ ", makeString(" ")],
    ["\\,", makeString("\u2009")],
    ["\\thinspace", makeString("\u2009")],
    ["\\:", makeString("\u2005")],
    ["\\>", makeString("\u2005")],
    ["\\medspace", makeString("\u2005")],
    // There's no exact unicode versions of `\medspace` or `\thickspace`, so we approximate
    ["\\;", makeString("\u2005")],
    ["\\thickspace", makeString("\u2005")],
    ["\\enspace", makeString("\u2002")],
    ["\\quad", makeString("\u2003")],
    ["\\qquad", makeString("\u2003\u2003")],
    // Marks the punctuation as ending a sentence; no substitute.
    ["\\@", makeString("")],
    // Italic correction; no substitute
    ["\\/", makeString("")],
    // Non-breaking space
    ["~", makeString("\u00A0")],
    ["- - -", makeString("—")],
    ["- -", makeString("–")],
    ["` `", makeString("“")],
    ["' '", makeString("”")],
    ["`", makeString("‘")],
    ["'", makeString("’")],
    ["\\$", makeString("$")],
    ["\\%", makeString("%")],
    ["\\_", makeString("_")],
    ["\\&", makeString("&")],
    ["\\#", makeString("#")],
    ["\\{", makeString("{")],
    ["\\}", makeString("}")],
    ["\\P", makeString("¶")],
    ["\\S", makeString("§")],
    ["\\dots", makeString("…")],
    ["\\ldots", makeString("…")],
    ["\\pounds", makeString("£")],
    ["\\copyright", makeString("©")],
    ...mappedLigatures,
]);

/**
 * Hash a sequence of nodes for quick lookup. This function assumes
 * that a space character does not appear in the content of any of the nodes.
 */
function hashNodes(nodes: (Ast.Macro | Ast.String)[]): string {
    return nodes
        .map((node) => (match.macro(node) ? `\\${node.content}` : node.content))
        .join(" ");
}

function isMacroOrStringArray(
    nodes: Ast.Node[]
): nodes is (Ast.Macro | Ast.String)[] {
    return nodes.some((node) => match.macro(node) || match.string(node));
}

/**
 * Map a sequence of nodes to its corresponding unicode ligature. E.g.,
 * `---` will be converted to `–` (an em-dash).
 *
 * This function assumes that `nodes` is a pure token stream with all whitespace
 * removed and an surrogate letters popped from their groups. (e.g. `\: o` and `\:{o}`
 * should be normalized to `["\:", "o"]` before calling this function.)
 */
export function ligatureToUnicode(nodes: Ast.Node[]): Ast.String | null {
    if (!isMacroOrStringArray(nodes)) {
        return null;
    }
    if (
        nodes.length === 1 &&
        match.macro(nodes[0], " ") &&
        nodes[0].escapeToken == null
    ) {
        // In this case we are the `\ ` macro. This cannot be handled by the hash-lookup method,
        // so we handle it manually.
        return makeString(" ");
    }
    return SUBSTITUTION_MAP.get(hashNodes(nodes)) || null;
}
