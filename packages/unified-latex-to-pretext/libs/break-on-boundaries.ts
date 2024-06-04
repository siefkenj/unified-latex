import { env, m } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { splitOnMacro, unsplitOnMacro } from "@unified-latex/unified-latex-util-split";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";

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

    // const splits = splitOnMacro(ast, divisions);
    // console.log(ast);

    // get list of nodes
    const content = (ast as Ast.Root).content;

    // split by parts first (probably turn this to a function, for each division since want to keep segments seperated?)
    const splits = splitOnMacro(content, "part"); // probably use splitOnCond when doing for groups
    // console.log(splits.macros[0]._renderInfo?.namedArguments)

    // check if there are any parts
    if (splits.macros.length != 0) {
        // could replace first part with \begin{_part}
        // but need to at \end
        // use env to create env node and pass in segment as body

        // loop through segments (skipping first segment)
        for (let i = 1; i < splits.segments.length; i++) {
            // create the title
            const title = getNamedArgsContent(splits.macros[i-1] || [])["title"];

            // add title to the front of the segment
            if (title) {
                splits.segments[i].unshift(m("title", (title[0] as Ast.Macro).content));
            }    

            // wrap segment around an environment
            console.log(env("_part", splits.segments[i]));
            splits.segments[i] = [env("_part", splits.segments[i])];

            // remove the part macro
            splits.macros[i-1] = m("") // didn't replace, appended
        }

        (ast as Ast.Root).content = unsplitOnMacro(splits);
    }

    // remove all empty nodes with replaceNode return null

    // maybe do groups seperately after, since they stay contained in one segment

}

function breakOnChapters(): void {

}
