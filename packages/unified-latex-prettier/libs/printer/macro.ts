import type { Doc } from "prettier";
import * as PrettierTypes from "./prettier-types";
import { getNodeInfo, fill, ESCAPE, indent, group } from "./common";
import { zip } from "../zip";
import * as Ast from "@unified-latex/unified-latex-types";

export function printMacro(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Macro;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const content =
        (node.escapeToken != null ? node.escapeToken : ESCAPE) + node.content;
    const args = node.args ? path.map(print, "args" as any) : [];

    // Some of the arguments want to be printed "inline".
    // We loop through the arguments and unwrap the inline ones.
    const rawArgs = [];
    for (const [arg, printedArg] of zip(node.args || [], args)) {
        const renderCache = referenceMap && referenceMap.getRenderCache(arg);
        if (renderInfo.inParMode && renderCache) {
            rawArgs.push(...(renderCache as any[]));
        } else {
            rawArgs.push(printedArg);
        }
    }

    if (referenceMap) {
        referenceMap.setRenderCache(node, { rawArgs, content });
    }

    if (renderInfo.hangingIndent) {
        return indent(fill([content, ...rawArgs]));
    }

    return group([content, ...rawArgs]);
}
