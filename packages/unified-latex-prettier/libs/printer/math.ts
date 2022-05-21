import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import * as PrettierTypes from "./prettier-types";
import {
    getNodeInfo,
    softline,
    fill,
    hardline,
    line,
    indent,
    ESCAPE,
    joinWithSoftline,
    formatDocArray,
} from "./common";

export function printInlineMath(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.InlineMath;

    // Since `$$` starts display math mode (in plain TeX),
    // an empty inline math environment must be printed as `$ $`.
    // We special case this.
    if (node.content.length === 0) {
        // We won't allow an empty math environment to be broken
        return ["$", " ", "$"];
    }

    let content = path.map(print, "content");
    content = formatDocArray(node.content, content, options);
    content = joinWithSoftline(content);

    // If the last node is a comment, we need a linebreak before the closing `$`
    if (node.content[node.content.length - 1].type === "comment") {
        content.push(hardline);
    }

    return fill(["$", ...content, "$"]);
}

export function printDisplayMath(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.InlineMath;

    let content = path.map(print, "content");
    content = formatDocArray(node.content, content, options);
    content = joinWithSoftline(content);

    // If we start with a comment on the same line as the environment
    // We should not insert a newline at the start of the environment body
    const bodyStartToken: PrettierTypes.Doc[] = [hardline];
    if (
        node.content.length === 0 ||
        (node.content[0].type === "comment" && node.content[0].sameline)
    ) {
        bodyStartToken.pop();
    }

    return [
        ESCAPE + "[",
        indent(fill(bodyStartToken.concat(content))),
        hardline,
        ESCAPE + "]",
    ];
}
