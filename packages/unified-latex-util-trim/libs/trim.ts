import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";

/**
 * Trims whitespace and parbreaks from the start and end
 * of an array. The number of trimmed nodes is returned.
 * Special care is taken to preserve comments, though any whitespace
 * before the first comment(s) or after the last comment(s) is trimmed.
 */
export function trim(nodes: Ast.Node[]): {
    trimmedStart: number;
    trimmedEnd: number;
} {
    if (!Array.isArray(nodes)) {
        console.warn("Trying to trim a non-array ast", nodes);
        return nodes;
    }

    const { trimmedStart } = trimStart(nodes);
    const { trimmedEnd } = trimEnd(nodes);

    return { trimmedStart, trimmedEnd };
}

/**
 * Trim whitespace and parbreaks from the left of an array.
 */
export function trimStart(nodes: Ast.Node[]): { trimmedStart: number } {
    const { start } = amountOfLeadingAndTrailingWhitespace(nodes);

    nodes.splice(0, start);

    // If there are comments at the start, they might have leading whitespace.
    // This leading whitespace should be trimmed
    for (const leadingToken of nodes) {
        if (!match.comment(leadingToken)) {
            break;
        }
        if (leadingToken.leadingWhitespace || leadingToken.sameline) {
            leadingToken.leadingWhitespace = false;
            // We remove the position information from this token to indicate that we've edited it
            delete leadingToken.position;
        }
        // Special care must be taken. If the comment was on the same line as a
        // parskip, it will no longer be on the same line after the trimming.
        // Thus, we must modify the comment.
        if (start > 0 && leadingToken.sameline) {
            leadingToken.sameline = false;
            delete leadingToken.position;
        }
    }

    return { trimmedStart: start };
}

/**
 * Trim whitespace and parbreaks from the right of an array.
 */
export function trimEnd(nodes: Ast.Node[]): { trimmedEnd: number } {
    const { end } = amountOfLeadingAndTrailingWhitespace(nodes);

    nodes.splice(nodes.length - end, end);

    // Trim off any spaces belonging to trailing comments
    for (let i = nodes.length - 1; i >= 0; i--) {
        const trailingToken = nodes[i];
        if (!match.comment(trailingToken)) {
            break;
        }
        // We don't trim spaces before trailing same-line comments. This is a stylistic choice
        // so that
        // `foo %xxx` does not become `foo%xxx`.
        // The latter is strictly "correct" for a trim function, but it is prettier to format
        // code preserving the space before the sameline comment
        if (
            match.comment(trailingToken) &&
            trailingToken.leadingWhitespace &&
            !trailingToken.sameline
        ) {
            trailingToken.leadingWhitespace = false;
            delete trailingToken.position;
        }
    }

    return { trimmedEnd: end };
}

/**
 * Returns the number of whitespace/parbreak nodes at the start and end of an array.
 */
function amountOfLeadingAndTrailingWhitespace(ast: Ast.Node[]): {
    start: number;
    end: number;
} {
    let start = 0;
    let end = 0;
    for (const node of ast) {
        if (match.whitespace(node) || match.parbreak(node)) {
            start++;
        } else {
            break;
        }
    }

    if (start === ast.length) {
        return { start, end: 0 };
    }

    // Find the padding on the right
    for (let i = ast.length - 1; i >= 0; i--) {
        const node = ast[i];
        if (match.whitespace(node) || match.parbreak(node)) {
            end++;
        } else {
            break;
        }
    }

    return { start, end };
}
