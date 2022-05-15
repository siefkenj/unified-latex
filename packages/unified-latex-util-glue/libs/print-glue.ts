import * as Ast from "@unified-latex/unified-latex-types";
import { Glue } from "./types";

/**
 * Prints a `Glue` object to an AST. After printing, `glue`
 * is turned into a sequence of string and whitespace nodes.
 * All structural information about the glue is lost.
 */
export function printGlue(glue: Glue): Ast.Node[] {
    const ret: Ast.Node[] = [
        { type: "string", content: `${glue.fixed.value}${glue.fixed.unit}` },
    ];
    if (glue.stretchable) {
        ret.push({ type: "whitespace" });
        ret.push({ type: "string", content: "plus" });
        ret.push({ type: "whitespace" });
        ret.push({
            type: "string",
            content: `${glue.stretchable.value}${glue.stretchable.unit}`,
        });
    }
    if (glue.shrinkable) {
        ret.push({ type: "whitespace" });
        ret.push({ type: "string", content: "minus" });
        ret.push({ type: "whitespace" });
        ret.push({
            type: "string",
            content: `${glue.shrinkable.value}${glue.shrinkable.unit}`,
        });
    }

    return ret;
}
