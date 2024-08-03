import * as Ast from "@unified-latex/unified-latex-types";
import { anyMacro, match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { KATEX_SUPPORT } from "./katex-subs";
import { VFileMessage } from "vfile-message";

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
                // get rid of type never
                node = node as Ast.Macro;

                // create a message specifing the unsupported macro
                const message = new VFileMessage(
                    `Warning: \"${node.content}\" is unsupported by Katex.`
                );

                // add the position of the group if available
                if (node.position) {
                    message.line = node.position.start.line;
                    message.column = node.position.start.column;
                    message.position = {
                        start: {
                            line: node.position.start.line,
                            column: node.position.start.column,
                        },
                        end: {
                            line: node.position.end.line,
                            column: node.position.end.column,
                        },
                    };
                }

                message.source = "latex-to-pretext:warning";
                unsupported.messages.push(message);
            }
        }
    });

    return unsupported;
}
