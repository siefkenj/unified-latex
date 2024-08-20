import * as Ast from "@unified-latex/unified-latex-types";
import { anyMacro, match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { KATEX_SUPPORT } from "./katex-subs";
import { VFileMessage } from "vfile-message";
import { makeWarningMessage } from "./utils";

/**
 * Return a list of macros used in ast that are unsupported by KaTeX
 */
export function reportMacrosUnsupportedByKatex(ast: Ast.Ast): {
    messages: VFileMessage[];
} {
    const unsupported: { messages: VFileMessage[] } = { messages: [] };

    // match a macro supported by Katex
    const isSupported = match.createMacroMatcher(KATEX_SUPPORT.macros);

    // visit all nodes
    visit(ast, (node, info) => {
        // macro in math mode
        if (anyMacro(node) && info.context.hasMathModeAncestor) {
            // check if not supported by katex
            if (!isSupported(node)) {
                // add a warning message
                unsupported.messages.push(
                    makeWarningMessage(
                        node,
                        `Warning: \"${
                            (node as Ast.Macro).content
                        }\" is unsupported by Katex.`,
                        "report-unsupported-macro-katex"
                    )
                );
            }
        }
    });

    return unsupported;
}
