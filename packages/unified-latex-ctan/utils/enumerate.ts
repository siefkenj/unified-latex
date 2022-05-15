import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { updateRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import { trim } from "@unified-latex/unified-latex-util-trim";

/**
 * Clean up any whitespace issues in an enumerate environment. In particular,
 *      * Remove any leading or ending whitespace
 *      * Ensure there is a par between occurrences of `\item`
 *      * Ensure there is whitespace after each occurrence of `\item` provided there is content there
 * `itemName` can be used to set what the "item" macro is called.
 *
 * This function attaches content following a `\item` to the `\item` macro with
 * `openMark` and `closeMark` set to empty. This allows hanging-indents to be rendered.
 */
export function cleanEnumerateBody(
    ast: Ast.Node[],
    itemName = "item"
): Ast.Node[] {
    let { segments, macros } = splitOnMacro(ast, itemName);
    // Trim the content of each block, but make sure there is a space
    // between each macro and the content. Since the first segment of content
    // appears *before* any macro, don't add a space there.
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        trim(segment);
        // The very first segment comes before any `\item` macros. It is either
        // blank or contains comments (or is invalid LaTeX). We don't insert a space
        // in this case.
        if (segment.length > 0 && i > 0) {
            segment.unshift({ type: "whitespace" });
        }
    }

    // We want a trailing indent for the `\item` nodes. We will
    // do this with a trick: we will add an argument to the index node
    // with openMark=" " and closeMark=""
    let body: Ast.Node[] = macros.map((node, i) => {
        const segment = segments[i + 1];
        node.args = node.args || [];
        node.args.push(arg(segment, { openMark: "", closeMark: "" }));
        updateRenderInfo(node, { inParMode: true });
        return node;
    });

    // We want a parbreak between each `\item` block and the preceding
    // content. We may or may not start with content, so act accordingly
    if (segments[0].length === 0) {
        body = body.flatMap((macro, i) =>
            i === 0 ? macro : [{ type: "parbreak" }, macro]
        );
    } else {
        body = body.flatMap((macro) => [{ type: "parbreak" }, macro]);
    }

    body.unshift(...segments[0]);

    return body;
}
