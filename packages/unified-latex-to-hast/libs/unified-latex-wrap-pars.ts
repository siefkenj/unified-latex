import { Plugin } from "unified";
import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import { EXIT, visit } from "../../unified-latex-util-visit";
import { wrapPars } from "./wrap-pars";

type PluginOptions = {
    macrosThatBreakPars?: string[];
    environmentsThatDontBreakPars?: string[];
} | void;

/**
 * Unified plugin to wrap paragraphs in `\html-tag:p{...}` macros.
 * Because `-` and `:` cannot occur in regular macros, there is no risk of
 * a conflict.
 */
export const unifiedLatexWrapPars: Plugin<PluginOptions[], Ast.Root, Ast.Root> =
    function unifiedLatexWrapPars(options) {
        const { macrosThatBreakPars, environmentsThatDontBreakPars } =
            options || {};
        return (tree) => {
            // If \begin{document}...\end{document} is present, we only wrap pars inside of it.
            let hasDocumentEnv = false;
            visit(
                tree,
                (env) => {
                    if (match.environment(env, "document")) {
                        hasDocumentEnv = true;

                        // While we're here, we might as well wrap the pars!
                        env.content = wrapPars(env.content, {
                            macrosThatBreakPars,
                            environmentsThatDontBreakPars,
                        });

                        return EXIT;
                    }
                },
                { test: match.anyEnvironment }
            );

            if (!hasDocumentEnv) {
                // If there is no \begin{document}...\end{document}, we wrap top-level pars only.
                tree.content = wrapPars(tree.content, {
                    macrosThatBreakPars,
                    environmentsThatDontBreakPars,
                });
            }
        };
    };
