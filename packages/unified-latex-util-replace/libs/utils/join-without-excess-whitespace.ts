import * as Ast from "../../../unified-latex-types";
import { match } from "../../../unified-latex-util-match";
import { trimStart } from "../../../unified-latex-util-trim";

/**
 * Is the node space-like? I.e., is it whitespace or
 * a comment with leading whitespace?
 */
function isSpaceLike(node: Ast.Node): boolean {
    return (
        match.whitespace(node) ||
        (match.comment(node) && Boolean(node.leadingWhitespace))
    );
}

/**
 * Similar to `head.push(...tail)` except that whitespace at the start
 * of `tail` and the end of `head` is collapsed.
 */
export function joinWithoutExcessWhitespace(
    head: Ast.Node[],
    tail: Ast.Node[]
): void {
    if (tail.length === 0) {
        return;
    }
    if (head.length === 0) {
        head.push(...tail);
        return;
    }
    const headEnd = head[head.length - 1];
    const tailStart = tail[0];
    // Whitespace we can just trim off from either end
    if (match.whitespace(headEnd) && match.whitespace(tailStart)) {
        head.push(...tail.slice(1));
        return;
    }
    // If there's no whitespace at one of the ends, no need to worry
    // unless `tailStart` is a comment, in which case it should "eat"
    // the whitespace
    if (!isSpaceLike(headEnd) || !isSpaceLike(tailStart)) {
        if (match.whitespace(headEnd) && match.comment(tailStart)) {
            const comment: Ast.Comment = {
                type: "comment",
                content: tailStart.content,
                sameline: true,
                leadingWhitespace: true,
            };
            tail = tail.slice(1);
            trimStart(tail);
            head.pop();
            head.push(comment, ...tail);
            return;
        }
        head.push(...tail);
        return;
    }

    // If we're here, we have a comment with leading whitespace on one side
    // and whitespace/comments on the other.
    if (match.comment(headEnd) && match.comment(tailStart)) {
        if (tailStart.leadingWhitespace || tailStart.sameline) {
            head.push(
                { type: "comment", content: tailStart.content },
                ...tail.slice(1)
            );
            return;
        }
        head.push(...tail);
        return;
    }

    // Exactly one side is a comment, so we should trim the whitespace and keep the comment,
    // but make sure the comment has leading whitespace!
    let comment = match.comment(headEnd) ? headEnd : tailStart;
    if (!match.comment(comment)) {
        throw new Error(
            `Expected a comment but found ${JSON.stringify(comment)}`
        );
    }

    if (!comment.leadingWhitespace || !comment.sameline) {
        comment = {
            type: "comment",
            content: comment.content,
            leadingWhitespace: true,
            sameline: true,
        };
    }

    head.pop();
    head.push(comment, ...tail.slice(1));
}
