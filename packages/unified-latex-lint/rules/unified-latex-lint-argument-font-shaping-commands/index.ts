import { lintRule } from "unified-lint-rule";
import { m, s } from "@unified-latex/unified-latex-builder";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { singleArgMacroFactory } from "../../utils/macro-factory";
import {
    firstSignificantNode,
    replaceNodeDuringVisit,
} from "@unified-latex/unified-latex-util-replace";
import { replaceStreamingCommand } from "@unified-latex/unified-latex-util-replace";
import { hasParbreak } from "../../utils/has-parbreak";
import { trimEnd, trimStart } from "@unified-latex/unified-latex-util-trim";

const REPLACEMENTS: Record<
    string,
    (content: Ast.Node | Ast.Node[]) => Ast.Macro
> = {
    bfseries: singleArgMacroFactory("textbf"),
    itshape: singleArgMacroFactory("textit"),
    rmfamily: singleArgMacroFactory("textrm"),
    scshape: singleArgMacroFactory("textsc"),
    sffamily: singleArgMacroFactory("textsf"),
    slshape: singleArgMacroFactory("textsl"),
    ttfamily: singleArgMacroFactory("texttt"),
};

const isReplaceable = match.createMacroMatcher(REPLACEMENTS);

/**
 * Returns true if the `group` is a group that starts with one of the `REPLACEMENT` macros.
 */
function groupStartsWithMacroAndHasNoParbreak(
    group: Ast.Ast
): group is Ast.Group {
    if (!match.group(group)) {
        return false;
    }
    // Find the first non-whitespace non-comment node
    let firstNode: Ast.Node | null = firstSignificantNode(group.content);
    return isReplaceable(firstNode) && !hasParbreak(group.content);
}

type PluginOptions =
    | {
          /**
           * Whether or not to fix the lint
           *
           * @type {boolean}
           */
          fix?: boolean;
      }
    | undefined;

export const DESCRIPTION = `## Lint Rule

Prefer using text shaping commands with arguments (e.g. \`\\textbf{foo bar}\`) over in-stream text shaping commands
(e.g. \`{\\bfseries foo bar}\`) if the style does not apply for multiple paragraphs.
This rule is useful when parsing LaTeX into other tree structures (e.g., when converting from LaTeX to HTML). 


This rule flags any usage of \`${Object.keys(REPLACEMENTS)
    .map((r) => printRaw(m(r)))
    .join("` `")}\`
`;

export const unifiedLatexLintArgumentFontShapingCommands = lintRule<
    Ast.Root,
    PluginOptions
>(
    { origin: "unified-latex-lint:argument-font-shaping-commands" },
    (tree, file, options) => {
        const lintedNodes = new Set();

        // We do two passes. First we deal with all the groups like `{\bfseries xxx}`
        // and then we replace all remaining streaming commands that appear in arrays.

        visit(
            tree,
            (group, info) => {
                const nodes = group.content;
                for (const node of nodes) {
                    if (isReplaceable(node) && !lintedNodes.has(node)) {
                        lintedNodes.add(node);
                        const macroName = node.content;
                        file.message(
                            `Replace "${printRaw(group)}" with "${printRaw(
                                REPLACEMENTS[macroName](s("..."))
                            )}"`,
                            node
                        );
                        break;
                    }
                }

                if (options?.fix) {
                    let fixed = replaceStreamingCommand(
                        group,
                        isReplaceable,
                        (content, command) => {
                            return REPLACEMENTS[command.content](content);
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
                }
            },
            { test: groupStartsWithMacroAndHasNoParbreak }
        );

        visit(
            tree,
            (nodes) => {
                if (hasParbreak(nodes)) {
                    return;
                }

                let hasReplaceableContent = false;
                for (const node of nodes) {
                    if (isReplaceable(node) && !lintedNodes.has(node)) {
                        lintedNodes.add(node);
                        hasReplaceableContent = true;
                        const macroName = node.content;
                        file.message(
                            `Replace "${printRaw(nodes)}" with "${printRaw(
                                REPLACEMENTS[macroName](s("..."))
                            )}"`,
                            node
                        );
                    }
                }

                if (hasReplaceableContent && options?.fix) {
                    // In an array replacements happen in-place
                    replaceStreamingCommand(
                        nodes,
                        isReplaceable,
                        (content, command) => {
                            return REPLACEMENTS[command.content](content);
                        }
                    );
                }
            },
            { includeArrays: true, test: Array.isArray }
        );
    }
);
