import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";

export function gatherTitle(ast: Ast.Ast): Ast.Node[] {
    const ti: Ast.Node[] = [];

    visit(ast, (node) => {
        if (match.macro(node, "title") && node.args) {
            const titleContent = Object.fromEntries(
                node.args.map((x) => [x.content])
            );
            return titleContent;
        }
    });
    return ti;
}

export function renderTitle(ast: Ast.Ast, title: Ast.Node): Ast.Macro {

    const renderedAuthorList = htmlLike({
        tag: "title",
        content: title,
    });

    return renderedAuthorList;
}
