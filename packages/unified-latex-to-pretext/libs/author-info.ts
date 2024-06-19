import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { anyMacro } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";

export function gatherAuthorInfo(ast: Ast.Ast): String[] {
    const authorList: any[] = [];

    visit(ast, (node) => {
        if (anyMacro(node) && node.args) {
            if (node.content == "author" || node.content == "address" || node.content == "email" ) {
                const authorInfo = Object.fromEntries(
                    node.args.map((x, i) => [`arg${i}`, String(x.content)])
                );
                authorList.push(authorInfo);
                node = renderAuthorInfo(node, node.content);
            }
        }
    });

    return authorList;
}

export function renderAuthorInfo(node: Ast.Node, content: string): Ast.Macro {
    if ((content = "author")) {
        content = "personname";
    } else if ((content = "address")) {
        content = "institution";
    }

    const renderedAuthorInfo = htmlLike({
        tag: content,
        attributes: Object,
        content: node,
    });

    return renderedAuthorInfo;
}
