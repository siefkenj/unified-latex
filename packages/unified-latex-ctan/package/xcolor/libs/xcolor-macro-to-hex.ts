import * as Ast from "../../../../unified-latex-types";
import { getArgsContent } from "../../../../unified-latex-util-arguments";
import { printRaw } from "../../../../unified-latex-util-print-raw";
import { xcolorColorToHex } from "./xcolor";
import { structuredClone } from "../../../../structured-clone";
import { deleteComments } from "../../../../unified-latex-util-comments";

/**
 * Compute the hex representation of a color specified by an xcolor color command.
 * For example `\color[rgb]{1 .5 .5}` or `\textcolor{red}{foo}`. If the color cannot be parsed,
 * `null` is returned for the hex value. In all cases a css variable name (prefixed with "--"")
 * is returned. This can be used to set up CSS for custom colors.
 */
export function xcolorMacroToHex(node: Ast.Macro): {
    hex: string | null;
    cssVarName: string;
} {
    // We do some destructive operations on the node, so clone it first.
    node = structuredClone(node);
    deleteComments(node);

    // We assume the node has signature "o m" where o is the model and
    // m is the color spec.

    const args = getArgsContent(node);
    const model = args[0] && printRaw(args[0]);
    const colorStr = printRaw(args[1] || []);
    let hex: string | null = null;
    try {
        hex = xcolorColorToHex(colorStr, model);
    } catch (e) {}

    const cssVarName = "--" + colorStr.replace(/[^a-zA-Z0-9-_]/g, "-");

    return { hex, cssVarName };
}
