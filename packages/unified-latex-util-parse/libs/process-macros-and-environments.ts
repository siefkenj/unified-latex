import * as Ast from "@unified-latex/unified-latex-types";
import { EnvInfoRecord, MacroInfoRecord } from "@unified-latex/unified-latex-types";
import { Plugin } from "unified";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import {
    unifiedLatexReparseMathConstructPlugin,
} from "./reparse-math";
import { attachMacroArgsInArray } from "@unified-latex/unified-latex-util-arguments";
import { processEnvironment } from "@unified-latex/unified-latex-util-environments";

type PluginOptions =
    | { environments: EnvInfoRecord; macros: MacroInfoRecord }
    | undefined;

/**
 * Unified plugin to process macros and environments. Any environments that contain math content
 * are reparsed (if needed) in math mode.
 */
export const unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexAttachMacroArguments(options) {
    const { environments = {}, macros = {} } = options || {};

    const mathMacros = Object.fromEntries(
        Object.entries(macros).filter(
            ([_, info]) => info.renderInfo?.inMathMode === true
        )
    );
    const mathEnvs = Object.fromEntries(
        Object.entries(environments).filter(
            ([_, info]) => info.renderInfo?.inMathMode === true
        )
    );

    const mathReparser = unifiedLatexReparseMathConstructPlugin({
        mathEnvs: Object.keys(mathEnvs),
        mathMacros: Object.keys(mathMacros),
    });

    const isRelevantEnvironment = match.createEnvironmentMatcher(environments);
    const isRelevantMathEnvironment = match.createEnvironmentMatcher(mathEnvs);

    return (tree) => {
        // First we attach all arguments/process all nodes/environments that have math content
        visit(
            tree,
            {
                enter: (nodes) => {
                    if (!Array.isArray(nodes)) {
                        return;
                    }
                    attachMacroArgsInArray(nodes, mathMacros);
                },
                leave: (node) => {
                    if (!isRelevantMathEnvironment(node)) {
                        return;
                    }
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
            { includeArrays: true }
        );

        // Next we reparse macros/envs that may not have been parsed in math mode
        mathReparser(tree);

        // Now we attach all arguments/process all environment bodies
        visit(
            tree,
            {
                enter: (nodes) => {
                    if (!Array.isArray(nodes)) {
                        return;
                    }
                    attachMacroArgsInArray(nodes, macros);
                },
                leave: (node) => {
                    if (!isRelevantEnvironment(node)) {
                        return;
                    }
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
            { includeArrays: true }
        );
    };
};
