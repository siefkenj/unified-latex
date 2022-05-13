import * as Ast from "../../unified-latex-types";
import { EnvInfoRecord } from "../../unified-latex-types";
import { Plugin } from "unified";
import { visit } from "../../unified-latex-util-visit";
import { match } from "../../unified-latex-util-match";
import { processEnvironment } from "./process-environment";
import { printRaw } from "../../unified-latex-util-print-raw";

type PluginOptions = { environments: EnvInfoRecord } | undefined;

/**
 * Unified plugin to process environment content and attach arguments.
 *
 * @param environments An object whose keys are environment names and values contains information about the environment and its argument signature.
 */
export const unifiedLatexProcessEnvironments: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexAttachMacroArguments(options) {
    const { environments = {} } = options || {};
    const isRelevantEnvironment = match.createEnvironmentMatcher(environments);

    return (tree) => {
        if (Object.keys(environments).length === 0) {
            console.warn(
                "Attempting to attach macro arguments but no macros are specified."
            );
        }

        visit(
            tree,
            {
                leave: (node) => {
                    const envName = printRaw(node.env);
                    const envInfo = environments[envName];
                    if (!envInfo) {
                        throw new Error(
                            `Could not find environment info for environment "${envName}"`
                        );
                    }
                    processEnvironment(node, envInfo);
                },
            },
            { test: isRelevantEnvironment }
        );
    };
};
