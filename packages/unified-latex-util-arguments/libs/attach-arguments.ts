import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { MacroInfoRecord } from "@unified-latex/unified-latex-types";
import { updateRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { gobbleArguments } from "./gobble-arguments";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Search (in a right-associative way) through the array for instances of
 * `macros` and attach arguments to the macro. Argument signatures are
 * specified by `macros[].signature`.
 *
 * Info stored in `macros[].renderInfo` will be attached to the node
 * with attribute `_renderInfo`.
 */
export function attachMacroArgsInArray(
    nodes: Ast.Node[],
    macros: MacroInfoRecord
): void {
    // Some preliminaries that are only used if `ast` is an array.
    let currIndex: number;

    /**
     * Determine whether `node` matches one of the macros in `macros`.
     * Care is taken when matching because not all macros have
     * `\` as their escape token.
     */
    const isRelevantMacro = match.createMacroMatcher(macros);

    function gobbleUntilMacro() {
        // Step backwards until we find the required macro
        while (currIndex >= 0 && !isRelevantMacro(nodes[currIndex])) {
            currIndex--;
        }
    }

    // Search for an occurrence of any of the macros `macroName` and its arguments.
    // Some macros are right-associative, so we should start searching from
    // the right
    currIndex = nodes.length - 1;
    while (currIndex >= 0) {
        gobbleUntilMacro();
        if (currIndex < 0) {
            // We didn't find an occurrence of the macro
            return;
        }

        // Store the currIndex, which is where the macro is. Start searching
        // for its arguments at the next index.
        const macroIndex = currIndex;
        const macro = nodes[macroIndex] as Ast.Macro;
        const macroName = macro.content;
        const macroInfo = macros[macroName];

        // Add `._renderInfo` if we have any
        updateRenderInfo(macro, macroInfo.renderInfo);

        // If the macro has no signature, it shouldn't consume any arguments. Just move along.
        // Node: It is important that this happens *after* `updateRenderInfo` is called, since
        // we still want to update the render info even if there are no args.
        if (macroInfo.signature == null) {
            currIndex--;
            continue;
        }

        // We don't want to search for macro arguments if we already
        // found them. If the macro has arguments, we assume that
        // they've already been attached
        if (macro.args != null) {
            currIndex = macroIndex - 1;
            continue;
        }

        // `currIndex` is the position of the macro. We want to start
        // looking for the arguments right after the macro
        currIndex++;
        const { args } = gobbleArguments(nodes, macroInfo.signature, currIndex);
        macro.args = args;
        // After we've gobbled the arguments, set
        // ourselves one space before the macro so we can continue.
        currIndex = macroIndex - 1;
    }
}

/**
 * Recursively search for and attach the arguments for a
 * particular macro to its AST node. `macros` should
 * contain a `signature` property which specifies the arguments
 * signature in xparse syntax.
 */
export function attachMacroArgs(tree: Ast.Ast, macros: MacroInfoRecord) {
    visit(
        tree,
        (nodes) => {
            attachMacroArgsInArray(nodes, macros);
        },
        { includeArrays: true, test: Array.isArray }
    );
}
