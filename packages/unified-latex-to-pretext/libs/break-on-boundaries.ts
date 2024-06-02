import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
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
    const splits = splitOnMacro(content, "section"); // probably use splitOnCond when doing for groups
    console.log(splits)

    // check if there are any parts
    if (splits.macros.length != 0) {

    }

    // maybe do groups seperately after, since they stay contained in one segment

}

function breakOnChapters(): void {

}
