import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { parseMathMinimal } from "./parse-minimal";

type PluginOptions =
    | {
          /**
           * List of environments whose body should be parsed in math mode
           */
          mathEnvs: string[];
          /**
           * List of macros whose bodies should be parsed in math mode
           */
          mathMacros: string[];
      }
    | undefined;

/**
 * Reparse math environments/macro contents that should have been parsed in math mode but weren't.
 */
export const unifiedLatexReparseMath: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexReparseMath(options) {
    const { mathEnvs = [], mathMacros = [] } = options || {};

    return unifiedLatexReparseMathConstructPlugin({ mathMacros, mathEnvs });
};

/**
 * Construct the inner function for the `unifiedLatexReparseMath` plugin. This function should not be used by libraries.
 */
export function unifiedLatexReparseMathConstructPlugin({
    mathEnvs,
    mathMacros,
}: {
    mathEnvs: string[];
    mathMacros: string[];
}) {
    const isMathEnvironment = match.createEnvironmentMatcher(mathEnvs);
    const isMathMacro = match.createMacroMatcher(mathMacros);

    return (tree: Ast.Root) => {
        visit(
            tree,
            (node) => {
                if (match.anyMacro(node)) {
                    for (const arg of node.args || []) {
                        if (
                            arg.content.length > 0 &&
                            !wasParsedInMathMode(arg.content)
                        ) {
                            arg.content = parseMathMinimal(
                                printRaw(arg.content)
                            );
                        }
                    }
                }
                if (match.anyEnvironment(node)) {
                    if (!wasParsedInMathMode(node.content)) {
                        node.content = parseMathMinimal(printRaw(node.content));
                    }
                }
            },
            {
                test: (node) => isMathEnvironment(node) || isMathMacro(node),
            }
        );
    };
}

/**
 * Use a heuristic to decide whether a string was parsed in math mode. The heuristic
 * looks for strings of length greater than 1 or the failure for "_" and "^" to be parsed
 * as a macro.
 */
function wasParsedInMathMode(nodes: Ast.Node[]): boolean {
    return !nodes.some(
        (node) =>
            // If there are multi-char strings or ^ and _ have been parsed as strings, we know
            // that we were not parsed in math mode.
            (match.anyString(node) && node.content.length > 1) ||
            match.string(node, "^") ||
            match.string(node, "_")
    );
}
