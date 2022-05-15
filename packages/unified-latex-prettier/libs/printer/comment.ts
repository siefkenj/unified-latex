import type { Doc } from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import * as PrettierTypes from "./prettier-types";

export function printComment(
    path: PrettierTypes.AstPath,
    _print: PrettierTypes.RecursivePrintFunc,
    _options: any
): Doc {
    const node = path.getNode() as Ast.Comment;

    // If a comment is on the same line as other content and it has leading whitespace,
    // add a single whitespace token.
    let leadingWhitespace = "";
    if (node.leadingWhitespace && node.sameline) {
        leadingWhitespace = " ";
    }

    const content: Doc[] = [leadingWhitespace, "%" + printRaw(node.content)];
    return content;
}
