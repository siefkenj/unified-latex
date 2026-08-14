import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { VFileMessage } from "vfile-message";
import { VFile } from "vfile";

/** One PreTeXt `<author>`'s fields, keyed by tag name (`personname`, `institution`, `email`). */
export type AuthorInfo = Record<string, Ast.Node[]>;

/**
 * Visits `\author`/`\address`/`\email` wherever they appear (preamble or
 * body) and groups them into one record per person: each `\author{...}`
 * starts a new group, and any `\address`/`\email` that follows (before the
 * next `\author`) is folded into that same group. This matches the common
 * LaTeX convention of repeating author/address/email once per person (e.g.
 * amsart-style multi-author papers). An `\address`/`\email` that appears
 * before any `\author` becomes its own standalone group.
 */
export function gatherAuthorInfo(ast: Ast.Ast, file: VFile): AuthorInfo[] {
    const authorList: AuthorInfo[] = [];
    let currentGroup: AuthorInfo | null = null;

    visit(ast, (node) => {
        if (match.macro(node, "author") && node.args) {
            currentGroup = { personname: lastArgContent(node) };
            authorList.push(currentGroup);
        } else if (match.macro(node, "address") && node.args) {
            const content = lastArgContent(node);
            if (currentGroup) {
                currentGroup.institution = content;
            } else {
                authorList.push({ institution: content });
            }
        } else if (match.macro(node, "email") && node.args) {
            const content = lastArgContent(node);
            if (currentGroup) {
                currentGroup.email = content;
            } else {
                authorList.push({ email: content });
            }
        } else if (match.macro(node, "affil")) {
            const message = createVFileMessage(node);
            file.message(message, message.place, "latex-to-pretext:warning");
        }
    });
    return authorList;
}

/** The last (mandatory) argument's content; `\author`/`\address`/`\email` all have signature `o m`. */
function lastArgContent(macro: Ast.Macro): Ast.Node[] {
    const args = getArgsContent(macro);
    return args[args.length - 1] || [];
}

/**
 * Render each gathered author group as its own `<author>` tag, per the
 * PreTeXt schema (`<author><personname/><institution/><email/></author>`).
 */
export function renderCollectedAuthorInfo(authorList: AuthorInfo[]): Ast.Macro[] {
    return authorList.map((info) =>
        htmlLike({
            tag: "author",
            content: Object.entries(info).map(([tag, content]) =>
                htmlLike({ tag, content })
            ),
        })
    );
}

function createVFileMessage(node: Ast.Macro): VFileMessage {
    const message = new VFileMessage(
        `Macro \"${node.content}\" is not supported`
    );

    // add the position of the macro if available
    if (node.position) {
        message.line = node.position.start.line;
        message.column = node.position.start.column;
        message.place = {
            start: {
                line: node.position.start.line,
                column: node.position.start.column,
            },
            end: {
                line: node.position.end.line,
                column: node.position.end.column,
            },
        };
    }

    message.source = "latex-to-pretext:warning";
    return message;
}
