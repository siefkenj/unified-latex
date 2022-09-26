import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";

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
    let i = 0;
    while (i < tree.length) {
        const macro = tree[i];
        const string = tree[i + 1];
        if (
            match.anyMacro(macro) &&
            match.anyString(string) &&
            // There are two options. Either the macro ends with the special character,
            // e.g. `\@foo` or the special character starts the next string, e.g. `\foo@`.
            (allowedTokens.has(
                macro.content.charAt(macro.content.length - 1)
            ) ||
                allowedTokens.has(string.content.charAt(0)))
        ) {
            macro.content += string.content;
            tree.splice(i + 1, 1);

            // Preserve the source location if available
            if (macro.position && string.position?.end) {
                macro.position.end = string.position.end;
            }
        } else {
            ++i;
        }
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
