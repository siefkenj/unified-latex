import { env, arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    anyEnvironment,
    anyMacro,
    match,
} from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import { visit } from "@unified-latex/unified-latex-util-visit";

// all divisions [division macro, environment]
const divisions: [string, string][] = [
    ["part", "_part"],
    ["chapter", "_chapter"],
    ["section", "_section"],
    ["subsection", "_subsection"],
    ["subsubsection", "_subsubsection"],
    ["paragraph", "_paragraph"],
    ["subparagraph", "_subparagraph"],
];

/**
 * Breaks up division macros into environments. Returns a list of warning messages
 * for any groups that were removed.
 */
export function breakOnBoundaries(ast: Ast.Ast): string[] {
    // messages for any groups removed
    const messages: string[] = [];

    visit(ast, (node, info) => {
        // needs to be an environment, root, or group node
        if (
            !(
                anyEnvironment(node) ||
                node.type === "root" ||
                match.group(node)
            ) ||
            // skip math mode
            info.context.hasMathModeAncestor
        ) {
            return;
        }
        // if it's an environment, make sure it isn't a newly created one
        else if (
            anyEnvironment(node) &&
            divisions.map((x) => x[1]).includes(node.env)
        ) {
            return;
        }

        // if it's a group, push a warning message
        if (match.group(node)) {
            messages.push(
                `Warning: hoisted out of a group, which might break the LaTeX code. { group: ${printRaw(
                    node
                )} }`
            );
        }

        // now break up the divisions, starting at part
        node.content = breakUp(node.content, divisions, 0);
    });

    replaceNode(ast, (node) => {
        // remove all old division nodes
        if (
            anyMacro(node) &&
            divisions.map((x) => x[0]).includes(node.content)
        ) {
            return null;
        }
        // remove groups
        else if (match.group(node)) {
            return node.content;
        }
    });

    return messages;
}

/**
 * Recursively breaks up the ast at the division macros.
 */
function breakUp(
    content: Ast.Node[],
    divisions: [string, string][],
    depth: number
): Ast.Node[] {
    // broke up all divisions
    if (depth > 6) {
        return content;
    }

    const splits = splitOnMacro(content, divisions[depth][0]);

    // go through each segment to recursively break
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakUp(splits.segments[i], divisions, depth + 1);
    }

    createEnvironments(splits, divisions[depth][1]);

    // rebuild this part of the ast
    return unsplitOnMacro(splits);
}

/**
 * Create the new environments that replace the division macros
 */
function createEnvironments(
    splits: { segments: Ast.Node[][]; macros: Ast.Macro[] },
    newEnviron: string
): void {
    // loop through segments (skipping first segment)
    for (let i = 1; i < splits.segments.length; i++) {
        // get the title
        const title = getNamedArgsContent(splits.macros[i - 1])["title"];
        const titleArg: Ast.Argument[] = [];

        // create title argument
        if (title) {
            titleArg.push(arg(title, { braces: "[]" }));
        }

        // wrap segment with a new environment
        splits.segments[i] = [env(newEnviron, splits.segments[i], titleArg)];
    }
}
