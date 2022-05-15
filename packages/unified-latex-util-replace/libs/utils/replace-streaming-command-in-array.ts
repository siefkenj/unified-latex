import * as Ast from "@unified-latex/unified-latex-types";
import { trimEnd, trimStart } from "@unified-latex/unified-latex-util-trim";
import { joinWithoutExcessWhitespace } from "./join-without-excess-whitespace";
import { wrapSignificantContent } from "./wrap-significant-content";

/**
 * Replace commands identified by `isStreamingCommand` with the return value of `replacer`.
 * E.g., the array `[head, streamingCommand, ...tail]` will become `[head, replacer(tail, streamingCommand)]`.
 * This function does not split based on parbreaks/etc.. It is right-associative and returns
 * the streaming commands that were encountered.
 */
export function replaceStreamingCommandInArray(
    nodes: Ast.Node[],
    isStreamingCommand: (node: any) => node is Ast.Macro,
    replacer: (
        content: Ast.Node[],
        streamingCommand: Ast.Macro
    ) => Ast.Node | Ast.Node[]
): { foundStreamingCommands: Ast.Node[] } {
    // Streaming commands that come at the end don't do anything,
    // so we should remove them
    while (nodes.length > 0 && isStreamingCommand(nodes[nodes.length - 1])) {
        nodes.pop();
        trimEnd(nodes);
    }

    const foundStreamingCommands: Ast.Node[] = [];

    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (isStreamingCommand(node)) {
            const wrapper = (content: Ast.Node[]) => replacer(content, node);
            let tail = nodes.slice(i + 1);
            // Streaming commands are followed by whitespace, which becomes unneeded when the commands are replaced.
            trimStart(tail);
            tail = wrapSignificantContent(tail, wrapper);
            foundStreamingCommands.push(node);

            // Trim off what we're about to replace!
            nodes.splice(i);

            joinWithoutExcessWhitespace(nodes, tail);
        }
    }

    return { foundStreamingCommands };
}
