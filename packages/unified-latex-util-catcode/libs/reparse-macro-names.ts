import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Escape a string so that it can be used to build a regular expression.
 *
 * From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 */
function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Build a regular expression that matches everything up to the first non-allowed symbol.
 */
function buildWordRegex(allowedSet: Set<string>): RegExp {
    // /\p{L}/ matches all letters, including unicode letters. We join this with
    // everything allowed in our set to form a regexp like
    //   /(\p{L}|_|:)*/u
    // The `u` at the end allows unicode characters to be matched.
    const regexpStr = `^(${["\\p{L}"]
        .concat(Array.from(allowedSet).map(escapeRegExp))
        .join("|")})*`;
    return new RegExp(regexpStr, "u");
}

/**
 * Checks whether the array has a macro that could be reparsed given the `allowedTokens` but
 * do not do any reparsing. This function can be used in auto-detection schemes to determine if
 * macro names should actually be reparsed.
 */
export function hasReparsableMacroNamesInArray(
    tree: Ast.Node[],
    allowedTokens: Set<string>
): boolean {
    for (let i = 0; i < tree.length; i++) {
        const macro = tree[i];
        const string = tree[i + 1];
        if (match.anyMacro(macro) && match.anyString(string)) {
            // There are two options. Either the macro ends with the special character,
            // e.g. `\@foo` or the special character starts the next string, e.g. `\foo@`.
            if (
                allowedTokens.has(
                    macro.content.charAt(macro.content.length - 1)
                ) ||
                allowedTokens.has(string.content.charAt(0))
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks whether `tree` has a macro that could be reparsed given the `allowedTokens` but
 * do not do any reparsing. This function can be used in auto-detection schemes to determine if
 * macro names should actually be reparsed.
 */
export function hasReparsableMacroNames(
    tree: Ast.Ast,
    allowedTokens: string | Set<string>
): boolean {
    if (typeof allowedTokens === "string") {
        allowedTokens = new Set(allowedTokens.split(""));
    }
    // Recast so typescript doesn't complain
    const _allowedTokens = allowedTokens;
    for (const v of _allowedTokens) {
        if (v.length > 1) {
            throw new Error(
                `Only single characters are allowed as \`allowedTokens\` when reparsing macro names, not \`${v}\`.`
            );
        }
    }

    let ret = false;
    visit(
        tree,
        (nodes) => {
            if (hasReparsableMacroNamesInArray(nodes, _allowedTokens)) {
                ret = true;
                return EXIT;
            }
        },
        { includeArrays: true, test: Array.isArray }
    );
    return ret;
}

/**
 * Reparses all macro names in the array so that they may optionally include characters listed in `allowedTokens`.
 * This is used, for example, when parsing expl3 syntax which allows `_` to be used in a macro name (even though
 * `_` is normally stops the parsing for a macro name).
 */
export function reparseMacroNamesInArray(
    tree: Ast.Node[],
    allowedTokens: Set<string>
) {
    const regex = buildWordRegex(allowedTokens);
    for (let i = 0; i < tree.length; i++) {
        const macro = tree[i];
        const string = tree[i + 1];
        if (
            !match.anyMacro(macro) ||
            // The _^ macros in math mode should not be extended no-matter what;
            // So we check to make sure that the macro we're dealing with has the default escape token.
            !(macro.escapeToken == null || macro.escapeToken === "\\") ||
            !match.anyString(string) ||
            // There are two options. Either the macro ends with the special character,
            // e.g. `\@foo` or the special character starts the next string, e.g. `\foo@`.
            !(allowedTokens.has(
                macro.content.charAt(macro.content.length - 1)
            ) ||
                allowedTokens.has(string.content.charAt(0)))
        ) {
            continue;
        }
        // The name may span several string nodes: in math mode every letter is
        // its own node, so `$\my@glyph$` arrives as `\my`, "@", "g", "l", ...
        let next: Ast.Node = string;
        do {
            // There might be a number somewhere in the string. If so, we should
            // break the string apart at that number
            const match = next.content.match(regex);
            const takeable = match ? match[0] : "";
            if (takeable.length === 0) {
                break;
            }
            if (takeable.length < next.content.length) {
                // Only part of the string can be appended to the macro name
                macro.content += takeable;
                next.content = next.content.slice(takeable.length);

                // Preserve the source location if available
                if (macro.position?.end) {
                    macro.position.end.offset += takeable.length;
                    macro.position.end.column += takeable.length;
                }
                if (next.position?.start) {
                    next.position.start.offset += takeable.length;
                    next.position.start.column += takeable.length;
                }
                break;
            }
            // The whole string can be appended to the macro name
            macro.content += next.content;
            tree.splice(i + 1, 1);

            // Preserve the source location if available
            if (macro.position && next.position?.end) {
                macro.position.end = next.position.end;
            }
            next = tree[i + 1];
        } while (match.anyString(next));
    }
}

/**
 * Reparses all macro names so that they may optionally include characters listed in `allowedTokens`.
 * This is used, for example, when parsing expl3 syntax which allows `_` to be used in a macro name (even though
 * `_` is normally stops the parsing for a macro name). Thus, a macro `\foo_bar:Nn` would be parsed as having
 * the name `foo_bar:Nn` rather than as `foo` followed by the strings `_`, `bar`, `:`, `Nn`.
 */
export function reparseMacroNames(
    tree: Ast.Ast,
    allowedTokens: string | Set<string>
) {
    if (typeof allowedTokens === "string") {
        allowedTokens = new Set(allowedTokens.split(""));
    }
    // Recast so typescript doesn't complain
    const _allowedTokens = allowedTokens;
    for (const v of _allowedTokens) {
        if (v.length > 1) {
            throw new Error(
                `Only single characters are allowed as \`allowedTokens\` when reparsing macro names, not \`${v}\`.`
            );
        }
    }

    visit(
        tree,
        (nodes) => {
            reparseMacroNamesInArray(nodes, _allowedTokens);
        },
        { includeArrays: true, test: Array.isArray }
    );
}
