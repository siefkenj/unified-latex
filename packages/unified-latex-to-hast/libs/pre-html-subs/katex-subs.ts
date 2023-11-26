import {
    attachSystemeSettingsAsRenderInfo,
    systemeContentsToArray,
} from "@unified-latex/unified-latex-ctan/package/systeme";
import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import KATEX_SUPPORT_LIST from "../katex-support.json";

const LEFT: Ast.Macro = { type: "macro", content: "left" };
const RIGHT: Ast.Macro = { type: "macro", content: "right" };
const DEFAULT_LEFT_DELIM: Ast.Macro = { type: "macro", content: "{" };
const DEFAULT_RIGHT_DELIM: Ast.String = { type: "string", content: "." };

export const katexSpecificMacroReplacements: Record<
    string,
    (node: Ast.Macro) => Ast.Node | Ast.Node[]
> = {
    systeme: (node) => {
        try {
            const args = getArgsContent(node);
            const whitelistedVariables = (args[1] || undefined) as
                | (Ast.String | Ast.Macro)[]
                | undefined;
            const equations = args[3] || [];
            const ret = systemeContentsToArray(equations, {
                properSpacing: false,
                whitelistedVariables,
            });

            // If we have information about the sysdelims, then apply them
            if (node._renderInfo?.sysdelims) {
                const [frontDelim, backDelim]: [Ast.Node, Ast.Node] = node
                    ._renderInfo?.sysdelims as any;

                return [LEFT, frontDelim, ret, RIGHT, backDelim];
            }

            return [LEFT, DEFAULT_LEFT_DELIM, ret, RIGHT, DEFAULT_RIGHT_DELIM];
        } catch (e) {
            return node;
        }
    },
    sysdelim: () => [],
};

function wrapInDisplayMath(ast: Ast.Node | Ast.Node[]): Ast.Node {
    const content = Array.isArray(ast) ? ast : [ast];

    return { type: "displaymath", content };
}

export const katexSpecificEnvironmentReplacements: Record<
    string,
    (node: Ast.Environment) => Ast.Node | Ast.Node[]
> = {
    // katex supports the align environments, but it will only render them
    // if you are already in math mode. Warning: these will produce invalid latex!
    align: wrapInDisplayMath,
    "align*": wrapInDisplayMath,
    alignat: wrapInDisplayMath,
    "alignat*": wrapInDisplayMath,
    equation: wrapInDisplayMath,
    "equation*": wrapInDisplayMath,
};

/**
 * Attach `renderInfo` needed for converting some macros into their
 * katex equivalents.
 */
export function attachNeededRenderInfo(ast: Ast.Ast) {
    attachSystemeSettingsAsRenderInfo(ast);
}

export const KATEX_SUPPORT = {
    macros: KATEX_SUPPORT_LIST["KATEX_MACROS"],
    environments: KATEX_SUPPORT_LIST["KATEX_ENVIRONMENTS"],
};
