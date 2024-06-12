import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { anyMacro, macro, match } from "@unified-latex/unified-latex-util-match";
import { convertToPretext } from "./convert-to-pretext";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";


export function collectAuthorInfo(ast: Ast.Ast): String[] {
    const authorList: string[] = [];

    visit(ast, (node) => {
        if(anyMacro(node) && node.args){
            if(node.content == "author"){
                const authorColumn =  convertToPretext(node, {
                    macroReplacements: {
                        xxbx: (node) =>
                            htmlLike({
                                tag: "author",
                                attributes: Object.fromEntries(
                                    (node.args || []).map((x, i) => [
                                        `arg${i}`,
                                        String(x.content),
                                    ])
                                ),
                            }),
                        textbf: (node) =>
                            htmlLike({
                                tag: "my-bold",
                                content: node.args?.[0]?.content || [],
                            }),
                    },
                    environmentReplacements: {
                        yyy: (node) =>
                            htmlLike({ tag: "yyy", content: node.content }),
                    },
                });
                console.log(authorColumn);
            };
        };
    });

    return authorList;
}