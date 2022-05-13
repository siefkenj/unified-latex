import { arg, m } from "../../unified-latex-builder";
import * as Ast from "../../unified-latex-types";
import { attributeName, tagName } from "./mangle";

/**
 * Make an html-like node storing `content`. The node is a macro and `content` as well
 * as any attributes can be extracted or further processed. Collisions are avoided with existing
 * macros because all macros are prefixed with `html-tag:` or `html-attribute:`, which contain
 * special characters that normal macros cannot have.
 */
export function htmlLike({
    tag,
    content,
    attributes,
}: {
    tag: string;
    content?: Ast.Node | Ast.Node[];
    attributes?: object;
}): Ast.Macro {
    if (!content) {
        content = [];
    }
    if (content && !Array.isArray(content)) {
        content = [content];
    }
    attributes = attributes || {};
    const attrs: Ast.Node[] = Object.entries(attributes).map(
        ([name, value]) => {
            value = JSON.stringify(value);
            return m(attributeName(name), arg(value));
        }
    );

    return m(tagName(tag), arg(attrs.concat(content)));
}
