import { env, m, arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    anyEnvironment,
    anyMacro,
    match,
} from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Breaks up division macros into environments
 */
export function breakOnBoundaries(ast: Ast.Ast): void {
    // messages for any groups removed
    const messages: string[] = [];

    const divisions = [
        "part",
        "chapter",
        "section",
        "subsection",
        "subsubsection",
        "paragraph",
        "subparagraph",
    ];

    const newBoundaries = [
        "_part",
        "_chapter",
        "_section",
        "_subsection",
        "_subsubsection",
        "_paragraph",
        "_subparagraph",
    ];

    visit(ast, (node, info) => {
        // needs to be an environment, root, or group node
        if (
            !(
                anyEnvironment(node) ||
                node.type === "root" ||
                match.group(node)
            ) ||
            info.context.hasMathModeAncestor
        ) {
            return;
        }

        // if it's an environment, make sure it isn't a newly created one
        else if (anyEnvironment(node) && newBoundaries.includes(node.env)) {
            return;
        }

        // now break up the divisions, starting at part
        node.content = breakUp(node.content, divisions, 0);
    });

    // remove all old division nodes
    replaceNode(ast, (node) => {
        if (anyMacro(node) && divisions.includes(node.content)) {
            return null;
        }
    });
}

/**
 * Recursively breaks up the ast at the parts macro to the subparagraph macro
 */
function breakUp(
    content: Ast.Node[],
    divisions: string[],
    depth: number
): Ast.Node[] {
    // broke up all divisions
    if (depth > 6) {
        return content;
    }

    const splits = splitOnMacro(content, divisions[depth]);

    // go through each segment to recursively break
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakUp(splits.segments[i], divisions, depth + 1);
    }

    createEnvironments(splits, "_" + divisions[depth]);

    depth++; // go to next division

    // rebuild this part of the ast
    return unsplitOnMacro(splits);
}

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
            titleArg.push(
                arg((title[0] as Ast.Macro).content, { braces: "[]" })
            );
        }

        console.log(titleArg);

        // wrap segment around a new environment
        splits.segments[i] = [env(newEnviron, splits.segments[i], titleArg)];
    }
}
