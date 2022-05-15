import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { trimEnd, trimStart } from "@unified-latex/unified-latex-util-trim";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { replaceStreamingCommand } from "./replace-streaming-command";
import { replaceNodeDuringVisit } from "./replace-node-during-visit";

type PluginOptions = {
    replacers: Record<
        string,
        (
            content: Ast.Node[],
            streamingCommand: Ast.Macro
        ) => Ast.Node | Ast.Node[]
    >;
};

/**
 * Unified plugin to replace all found streaming commands with their argument-style equivalents.
 * This only applies to sections of the tree with no math ancestor.
 *
 * @param options.replacer A record of macro names and replacer functions. A replacer function accepts content and the original streaming command and is expected to return the argument-style command. It may be called multiple times per streaming command.
 */
export const unifiedLatexReplaceStreamingCommands: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexReplaceStreamingCommands(options) {
    const { replacers = {} } = options || {};
    const isReplaceable = match.createMacroMatcher(replacers);
    return (tree) => {
        visit(
            tree,
            (group, info) => {
                if (
                    info.context.hasMathModeAncestor ||
                    !group.content.some(isReplaceable)
                ) {
                    return;
                }

                let fixed = replaceStreamingCommand(
                    group,
                    isReplaceable,
                    (content, command) => {
                        return replacers[command.content](content, command);
                    }
                );

                // We cannot replace the node unless we can access the containing array.
                if (!info.containingArray || info.index == null) {
                    return;
                }

                // `fixed` may consist of only whitespace. If this is the case,
                // surrounding whitespace must trimmed before
                // inserting the group's contents.
                const prevToken = info.containingArray[info.index - 1];
                const nextToken = info.containingArray[info.index + 1];
                if (
                    match.whitespaceLike(prevToken) &&
                    match.whitespaceLike(fixed[0])
                ) {
                    trimStart(fixed);
                }
                if (
                    match.whitespaceLike(nextToken) &&
                    match.whitespaceLike(fixed[fixed.length - 1])
                ) {
                    trimEnd(fixed);
                }
                replaceNodeDuringVisit(fixed, info);
            },
            { test: match.group }
        );

        visit(
            tree,
            (nodes, info) => {
                if (
                    info.context.hasMathModeAncestor ||
                    !nodes.some(isReplaceable)
                ) {
                    return;
                }

                const replaced = replaceStreamingCommand(
                    nodes,
                    isReplaceable,
                    (content, command) => {
                        return replacers[command.content](content, command);
                    }
                );

                // If we get back a different array than we input, the replacement did
                // not happen in-place. In this case we need to manipulate `nodes`.
                if (replaced !== nodes) {
                    nodes.length = 0;
                    nodes.push(...replaced);
                }
            },
            { includeArrays: true, test: Array.isArray }
        );
    };
};
