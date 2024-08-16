import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { VFileMessage } from "vfile-message";
import { VFile } from "vfile";

/**
 * This function collects titles, even without \maketitle.
 * It takes the last title before the ducument class and warn if there are multiple,
 */
export function gatherTitle(ast: Ast.Ast, file: VFile): Ast.Node[] {
    const ti: Ast.Node[] = [];

    visit(ast, (node) => {
        if (match.macro(node, "title") && node.args) {
            const titleContent = Object.fromEntries(
                node.args.map((x) => ["title",x.content])
            );
            ti.push(titleContent.title[0]);
        }
    });
    if (ti.length > 1) {
        const message = new VFileMessage(
            `There are multiple titles, the last title was displayed.`
        );
        file.message(message, message.position, "latex-to-pretext:warning");
    }
    return ti;
}

/**
 * This function wraps around the title collected and returns a htmllike macro.
 */
export function renderTitle(title: Ast.Node[]): Ast.Macro {
    const renderedAuthorList = htmlLike({
        tag: "title",
        content: title,
    });

    return renderedAuthorList;
}
