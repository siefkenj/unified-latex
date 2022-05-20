import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import {
    splitOnCondition,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import {
    trim,
    trimEnd,
    trimStart,
} from "@unified-latex/unified-latex-util-trim";
import { firstSignificantNode } from "./utils/significant-node";
import { replaceStreamingCommandInArray } from "./utils/replace-streaming-command-in-array";
import { wrapSignificantContent } from "./utils/wrap-significant-content";

type Replacer = (nodes: Ast.Node[]) => Ast.Node[];

/**
 * Process streaming commands in a group. If needed, "escape" the group.
 * For example, `{\bfseries xx}` -> `\textbf{xx}`, but `{foo \bfseries xx}` -> `{foo \textbf{xx}}`.
 */
export function replaceStreamingCommandInGroup(
    group: Ast.Group,
    isStreamingCommand: (node: any) => node is Ast.Macro,
    replacer: (
        content: Ast.Node[],
        streamingCommand: Ast.Macro
    ) => Ast.Node | Ast.Node[],
    options?: {
        macrosThatBreakPars?: string[];
        environmentsThatDontBreakPars?: string[];
    }
): Ast.Node[] {
    const content = group.content;
    // If the group started with a streaming command, we want to pop
    // out of the group. E.g. `{\bfseries foo}` -> `\textbf{foo}` and not `{\textbf{foo}}`
    let popFromGroup = isStreamingCommand(firstSignificantNode(content));

    let innerProcessed = replaceStreamingCommand(
        content,
        isStreamingCommand,
        replacer,
        options
    );

    // If the group consisted of just streaming commands (for some reason...)
    // it should be eliminated
    if (innerProcessed.length === 0) {
        return [];
    }

    if (popFromGroup) {
        return innerProcessed;
    } else {
        return [{ type: "group", content: innerProcessed }];
    }
}

/**
 * Given a group or a node array, look for streaming commands (e.g., `\bfseries`) and replace them
 * with the specified macro. The "arguments" of the streaming command are passed to `replacer` and the return
 * value of `replacer` is inserted into the stream.
 *
 * By default, this command will split at parbreaks (since commands like `\textbf{...} do not accept parbreaks in their
 * contents) and call `replacer` multiple times, once per paragraph.
 *
 * Commands are also split at environments and at any macros listed in `macrosThatBreakPars`.
 */
export function replaceStreamingCommand(
    ast: Ast.Group | Ast.Node[],
    isStreamingCommand: (node: any) => node is Ast.Macro,
    replacer: (
        content: Ast.Node[],
        streamingCommand: Ast.Macro
    ) => Ast.Node | Ast.Node[],
    options?: {
        macrosThatBreakPars?: string[];
        environmentsThatDontBreakPars?: string[];
    }
): Ast.Node[] {
    if (typeof isStreamingCommand !== "function") {
        throw new Error(
            `'isStreamingCommand' must be a function, not '${typeof isStreamingCommand}'`
        );
    }

    const {
        macrosThatBreakPars = [
            "part",
            "chapter",
            "section",
            "subsection",
            "subsubsection",
            "vspace",
            "smallskip",
            "medskip",
            "bigskip",
            "hfill",
        ],
        environmentsThatDontBreakPars = [],
    } = options || {};

    let processedContent: Ast.Node[] = [];
    if (match.group(ast)) {
        processedContent = replaceStreamingCommandInGroup(
            ast,
            isStreamingCommand,
            replacer
        );
    }

    if (Array.isArray(ast)) {
        // Streaming commands that come at the end of a sequence of nodes don't do anything.
        // They also will consume whitespace, so we should remove them and the whitespace.
        const nodes = ast;
        let scanIndex = nodes.length;
        let sliceIndex = scanIndex;
        while (
            scanIndex > 0 &&
            (isStreamingCommand(nodes[scanIndex - 1]) ||
                match.whitespace(nodes[scanIndex - 1]))
        ) {
            scanIndex--;
            if (isStreamingCommand(nodes[scanIndex])) {
                sliceIndex = scanIndex;
            }
        }
        if (sliceIndex !== nodes.length) {
            nodes.splice(sliceIndex);
        }

        const macroThatBreaks = match.createMacroMatcher(macrosThatBreakPars);
        const envThatDoesntBreak = match.createEnvironmentMatcher(
            environmentsThatDontBreakPars
        );
        // A "par" is anything that a streaming command shouldn't wrap and breaks the stream.
        // This includes regular pars, but also environments and special macros like \section
        const isPar = (node: Ast.Node) =>
            match.parbreak(node) ||
            match.macro(node, "par") ||
            macroThatBreaks(node) ||
            (match.environment(node) && !envThatDoesntBreak(node)) ||
            node.type === "displaymath";

        // We split on both a parbreak and a literal `\par`. But we will
        // normalize everything to be parbreaks
        const splitByPar = splitOnCondition(nodes, isPar);
        splitByPar.separators = splitByPar.separators.map((sep) =>
            match.macro(sep, "par") ? { type: "parbreak" } : sep
        );

        const replacers: Replacer[] = [];
        let segments = splitByPar.segments.map((segment) => {
            if (segment.length === 0) {
                return segment;
            }
            function applyAccumulatedReplacers(nodes: Ast.Node[]): Ast.Node[] {
                if (replacers.length === 0) {
                    return nodes;
                }
                return wrapSignificantContent(
                    nodes,
                    composeReplacers(replacers)
                );
            }

            const { foundStreamingCommands } = replaceStreamingCommandInArray(
                segment,
                isStreamingCommand,
                replacer
            );

            // All streaming commands in `segment` have now been replaced. However,
            // there might be commands from the previous paragraphs that should wrap
            // the current segment!
            const ret = applyAccumulatedReplacers(segment);

            // Any streaming commands from this segment will carry over to the next,
            // so keep track of them.
            foundStreamingCommands.forEach((macro) => {
                replacers.push((nodes: Ast.Node[]) => {
                    const ret = replacer(nodes, macro as Ast.Macro);
                    if (!Array.isArray(ret)) {
                        return [ret];
                    }
                    return ret;
                });
            });

            return ret;
        });

        // Leading/trailing whitespace was hoisted in front/back of each replacer.
        // Since we're separated by parbreaks, we can safely trim all that whitespace.
        if (segments.length > 1) {
            segments.forEach((segment, i) => {
                if (i === 0) {
                    trimEnd(segment);
                } else if (i === segments.length - 1) {
                    trimStart(segment);
                } else {
                    trim(segment);
                }
            });
        }

        processedContent = unsplitOnMacro({
            segments: segments,
            macros: splitByPar.separators,
        });
    }

    return processedContent;
}

/**
 * Given a sequence of replacer functions `[f, g, h]` return
 * `h \circ g \circ f`
 *
 * @param {((nodes: Ast.Node[]) => Ast.Node)[]} replacers
 * @returns {(nodes: Ast.Node[]) => Ast.Node}
 */
function composeReplacers(replacers: Replacer[]): Replacer {
    if (replacers.length === 0) {
        throw new Error("Cannot compose zero replacement functions");
    }
    return (nodes: Ast.Node[]) => {
        let ret = nodes;
        for (let i = 0; i < replacers.length; i++) {
            const func = replacers[i];
            ret = func(ret);
        }
        return ret;
    };
}
