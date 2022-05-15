import type { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { trim, trimEnd, trimStart } from "./trim";

type PluginOptions = void;

/**
 * Unified plugin to trim the whitespace from the start/end of any environments, including
 * math environments.
 */
export const unifiedLatexTrimEnvironmentContents: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexTrimEnvironmentContents() {
    return (tree) => {
        visit(tree, (node) => {
            if (!(match.math(node) || match.anyEnvironment(node))) {
                return;
            }

            // If the first thing in the environment is a sameline comment,
            // we actually want to start trimming *after* it.
            let firstNode = node.content[0];
            if (match.comment(firstNode) && firstNode.sameline) {
                firstNode.suffixParbreak = false;
                trimEnd(node.content);

                // We play a nasty trick here. This call to `trimStart`
                // will actually modify `node.content` if `node.content.slice(1)` starts
                // with a comment that has leading whitespace (it will remove that whitespace).
                // However, it won't remove any elements from `node.content`; we need
                // to do that ourselves.
                const { trimmedStart } = trimStart(node.content.slice(1));
                node.content.splice(1, trimmedStart);
            } else {
                trim(node.content);
            }
        });
    };
};
