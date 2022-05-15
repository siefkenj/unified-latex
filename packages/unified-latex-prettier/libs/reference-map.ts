import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Generate a data structure that can be queried
 * for the next/previous node. This allows for "peeking"
 * during the rendering process.
 *
 * @class ReferenceMap
 */
export class ReferenceMap {
    ast: Ast.Ast;
    map: Map<
        Ast.Ast,
        { previous?: Ast.Ast; next?: Ast.Ast; renderCache?: any }
    >;

    constructor(ast: Ast.Ast) {
        this.ast = ast;
        this.map = new Map();
        visit(
            this.ast,
            (nodeList) => {
                for (let i = 0; i < nodeList.length; i++) {
                    this.map.set(nodeList[i], {
                        previous: nodeList[i - 1],
                        next: nodeList[i + 1],
                    });
                }
            },
            { includeArrays: true, test: Array.isArray }
        );
    }

    /**
     * Associate render-specific data with this node. This data
     * will be overwritten if `setRenderCache` is called twice.
     *
     * @param {Ast.Ast} node
     * @param {*} data
     * @memberof ReferenceMap
     */
    setRenderCache(node: any, data: any): void {
        const currData = this.map.get(node) || {};
        this.map.set(node, { ...currData, renderCache: data });
    }

    /**
     * Retrieve data associated with `node` via `setRenderCache`
     *
     * @param {Ast.Ast} node
     * @returns {(object | undefined)}
     * @memberof ReferenceMap
     */
    getRenderCache(node: any): object | any[] | undefined {
        return this.map.get(node)?.renderCache;
    }

    getPreviousNode(node: Ast.Ast): Ast.Node | undefined {
        return (this.map.get(node) || ({} as any)).previous;
    }

    getNextNode(node: Ast.Ast): Ast.Node | undefined {
        return (this.map.get(node) || ({} as any)).next;
    }
}
