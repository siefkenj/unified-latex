import { env, m } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { anyMacro } from "@unified-latex/unified-latex-util-match";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";

export function breakOnBoundaries(ast: Ast.Ast): void {
    const divisions = [
        "part",
        "chapter",
        "section",
        "subsection",
        "subsubsection",
        "paragraph",
        "subparagraph",
    ];

    // get list of nodes
    const content = (ast as Ast.Root).content;

    // split by parts first
    const splits = splitOnMacro(content, "part");

    // keep each segment seperated
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakOnChapters(splits.segments[i]);
    }

    // create the environments
    createEnvironments(splits, "_part");

    // rebuild the ast
    (ast as Ast.Root).content = unsplitOnMacro(splits);

    // remove all empty nodes
    replaceNode(ast, (node) => {
        if (anyMacro(node) && divisions.includes(node.content)) {
            return null;
        }
    });
}

function createEnvironments(
    splits: { segments: Ast.Node[][]; macros: Ast.Macro[] },
    name: string
): void {
    // loop through segments (skipping first segment)
    for (let i = 1; i < splits.segments.length; i++) {
        // create the title
        const title = getNamedArgsContent(splits.macros[i - 1] || [])["title"];

        // add title to the front of the segment
        if (title) {
            splits.segments[i].unshift(
                m("title", (title[0] as Ast.Macro).content)
            );
        }

        // wrap segment around an environment
        splits.segments[i] = [env(name, splits.segments[i])];
    }
}

function breakOnChapters(segment: Ast.Node[]): Ast.Node[] {
    // split by chapters
    const splits = splitOnMacro(segment, "chapter");
    console.log(splits);

    // keep each segment seperated
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakOnSections(splits.segments[i]);
    }

    // create the environments
    createEnvironments(splits, "_chapter");

    // rebuild the ast
    return unsplitOnMacro(splits);
}

function breakOnSections(segment: Ast.Node[]): Ast.Node[] {
    // split by chapters
    const splits = splitOnMacro(segment, "section");

    // keep each segment seperated
    // for (let i = 0; i < splits.segments.length; i++) {
    //     splits.segments[i] = breakOnSections(splits.segments[i]);
    // }

    // create the environments
    createEnvironments(splits, "_section");

    // rebuild the ast
    return unsplitOnMacro(splits);
}
