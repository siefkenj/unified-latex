import * as Ast from "../../../unified-latex-types";
import { match } from "../../../unified-latex-util-match";

/**
 * Wraps `content` in the specified wrapper. This command is roughly equivalent to
 * `wrapper(content)` except that leading and trailing whitespace and comments are extracted
 * from `content` and moved to the front or back of the return array. For example,
 * `[" ", "foo", "bar", "% xxx"]` -> `[" ", wrapped(["foo", "bar"]), "% xxx"]`.
 *
 */
export function wrapSignificantContent(
    content: Ast.Node[],
    wrapper: (content: Ast.Node[]) => Ast.Node[] | Ast.Node
): Ast.Node[] {
    let hoistUntil = 0;
    let hoistAfter = content.length;
    for (let i = 0; i < content.length; i++) {
        if (match.whitespace(content[i]) || match.comment(content[i])) {
            hoistUntil = i + 1;
            continue;
        }
        break;
    }
    for (let j = content.length - 1; j >= 0; j--) {
        if (match.whitespace(content[j]) || match.comment(content[j])) {
            hoistAfter = j;
            continue;
        }
        break;
    }

    if (hoistUntil === 0 && hoistAfter === content.length) {
        return ensureArray(wrapper(content));
    }

    const frontMatter = content.slice(0, hoistUntil);
    const middle = content.slice(hoistUntil, hoistAfter);
    const backMatter = content.slice(hoistAfter, content.length);

    return frontMatter.concat(wrapper(middle), backMatter);
}

function ensureArray(x: Ast.Node | Ast.Node[]) {
    if (!Array.isArray(x)) {
        return [x];
    }
    return x;
}
