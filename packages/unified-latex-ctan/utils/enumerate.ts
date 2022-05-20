import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { updateRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import {
    lastSignificantNode,
    lastSignificantNodeIndex,
} from "@unified-latex/unified-latex-util-replace";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import { trim, trimEnd } from "@unified-latex/unified-latex-util-trim";

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
        if (i === 0) {
            // The very first segment might be comment with leading whitespace. We don't want to trim that off
            trimEnd(segment);
        } else {
            trim(segment);
        }
        // The very first segment comes before any `\item` macros. It is either
        // blank or contains comments (or is invalid LaTeX). We don't insert a space
        // in this case.
        if (segment.length > 0 && i > 0) {
            segment.unshift({ type: "whitespace" });
        }
    }

    let insertParbreakBefore: WeakSet<Ast.Node> = new WeakSet();

    // We want a trailing indent for the `\item` nodes. We will
    // do this with a trick: we will add an argument to the index node
    // with openMark=" " and closeMark=""
    let body: Ast.Node[] = macros.flatMap((node, i) => {
        const segment = segments[i + 1];
        const trailingComments = popTrailingComments(segment);
        node.args = node.args || [];
        node.args.push(arg(segment, { openMark: "", closeMark: "" }));
        updateRenderInfo(node, { inParMode: true });

        // The stream contains a mix of `\item` macros and comments/parbreaks. We only
        // want to insert parbreaks before `\item` macros, so we record these for later.
        if (i > 0 || segments[0]?.length > 0) {
            insertParbreakBefore.add(node);
        }

        return [node, ...trailingComments];
    });

    // We want a parbreak between each `\item` block and the preceding content.
    // We've already logged the `\item` macros in `insertParbreakBefore`.
    body = body.flatMap((node) =>
        insertParbreakBefore.has(node) ? [{ type: "parbreak" }, node] : node
    );

    body.unshift(...segments[0]);

    // We have inserted parbreaks so some comments need to be told that there is a suffix parbreak
    for (let i = 0; i < body.length - 1; i++) {
        const node = body[i];
        const nextNode = body[i + 1];
        if (!match.parbreak(nextNode)) {
            continue;
        }
        if (match.comment(node)) {
            node.suffixParbreak = true;
        }
        // The heuristic for detecting an `item`-like node is that its last argument has no close mark.
        // Regardless of what it is, if there is no close mark, when rendered we don't want two newlines to
        // appear.
        if (
            match.macro(node) &&
            node.args &&
            node.args[node.args.length - 1].closeMark === ""
        ) {
            const args = node.args[node.args.length - 1].content;
            const lastArg = args[args.length - 1];
            if (match.comment(lastArg)) {
                lastArg.suffixParbreak = true;
            }
        }
    }

    return body;
}

/**
 * Removes and returns any number of trailing comments/parbreaks from `nodes`.
 */
function popTrailingComments(nodes: Ast.Node[]): Ast.Node[] {
    let lastNodeIndex = lastSignificantNodeIndex(nodes, true);
    if (
        lastNodeIndex === nodes.length - 1 ||
        (lastNodeIndex == null && nodes.length === 0)
    ) {
        return [];
    }

    // If `nodes` has a non-zero length and we didn't find a significant node, everything is comments!
    if (lastNodeIndex == null) {
        lastNodeIndex = -1;
    }
    return nodes.splice(lastNodeIndex + 1);
}
