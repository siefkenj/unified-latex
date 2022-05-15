import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Updates the `._renderInfo` property on a node to include
 * whatever has been supplied to `renderInfo`. If `renderInfo`
 * is null, no update is performed.
 *
 * *This operation mutates `node`*
 */
export function updateRenderInfo(
    node: Ast.Node,
    renderInfo: object | null | undefined
) {
    if (renderInfo != null) {
        node._renderInfo = { ...(node._renderInfo || {}), ...renderInfo };
    }
    return node;
}

/**
 * Removes any `_renderInfo` and `position` tags present in the AST. This
 * operation is _destructive_.
 */
export function trimRenderInfo(ast: Ast.Ast) {
    visit(ast, (node) => {
        delete node._renderInfo;
        delete node.position;
    });
    return ast;
}

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Functions to help modify the `_renderInfo` of a `unified-latex` Abstract Syntax Tree (AST).
 *
 * ## When should I use this?
 *
 * If you want to compare the structure of an AST without position information or extra information
 * that is kept for pretty-printing, these functions can be used to remove/modify the `_renderInfo`
 * of an `Ast.Node`.
 */
