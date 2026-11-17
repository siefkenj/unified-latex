import * as Ast from "@unified-latex/unified-latex-types";
import {
    EnvInfoRecord,
    MacroInfoRecord,
} from "@unified-latex/unified-latex-types";
import { Plugin } from "unified";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { attachMacroArgsInArray } from "@unified-latex/unified-latex-util-arguments";
import {
    attachEnvironmentArgs,
    processEnvironment,
} from "@unified-latex/unified-latex-util-environments";
import {
    argumentContentBounds,
    environmentContentBounds,
    argumentInMathMode,
    reparseInMode,
    wasParsedInMathMode,
    wasParsedInTextMode,
} from "./reparse-in-mode";
import { trimMathWhitespace } from "./trim-math-whitespace";
import { ownProperty } from "./ctan-info";

type PluginOptions =
    | { environments: EnvInfoRecord; macros: MacroInfoRecord }
    | undefined;

/**
 * Unified plugin to process macros and environments. Any macro arguments or environment
 * bodies that are in a different mode (math mode vs. text mode) than the one they were
 * parsed in are reparsed.
 *
 * The PEG grammar parses everything in the mode of its surroundings (except environment
 * bodies, which are parsed in text mode). Since the tree is processed from the top down,
 * the content of each array was parsed in the mode it is in, and only the arguments
 * of macros that switch modes (e.g. `\text{...}` inside of math or `\ensuremath{...}`
 * outside of math) and environment bodies need to be reparsed.
 */
export const unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse(options) {
    const { environments = {}, macros = {} } = options || {};

    return (tree, file) => {
        const source = typeof file?.value === "string" ? file.value : undefined;
        const inMathMode =
            (tree._renderInfo as { inMathMode?: boolean } | undefined)
                ?.inMathMode === true;
        processMacrosAndEnvironments(tree, {
            macros,
            environments,
            source,
            inMathMode,
        });
    };
};

/**
 * Attach the arguments of `macros` and environments in `tree` and reparse any macro arguments
 * or environment bodies that are in a different mode than the one they were parsed in.
 * `tree` must have been parsed in mode `inMathMode`, and `source` (if given) is the string
 * it was parsed from. Content that has already been processed (macros with arguments attached
 * and environments whose mode is recorded) is not reparsed, so `tree` can be processed again.
 *
 * Content is reparsed from `source`. If `source` is not given (or `tree` was changed after
 * parsing so that it no longer matches `source`), the content is printed and the result is
 * reparsed, which may give the wrong result (see `reparseInMode`).
 */
export function processMacrosAndEnvironments(
    tree: Ast.Ast,
    {
        macros,
        environments,
        source,
        inMathMode: startInMathMode = false,
    }: {
        macros: MacroInfoRecord;
        environments: EnvInfoRecord;
        source?: string;
        inMathMode?: boolean;
    }
) {
    visit(
        tree,
        {
            enter: (node, info) => {
                const inMathMode = !!info.context.inMathMode;
                if (Array.isArray(node)) {
                    const unattached = new Set(
                        node.filter(
                            (child) =>
                                match.anyMacro(child) && child.args == null
                        )
                    );
                    attachMacroArgsInArray(node, macros);
                    for (const child of node) {
                        if (match.anyMacro(child)) {
                            reparseMacroArgs(
                                child,
                                inMathMode,
                                !unattached.has(child),
                                source
                            );
                        }
                    }
                    return;
                }
                if (match.anyEnvironment(node)) {
                    reparseEnvironmentBody(
                        node,
                        inMathMode,
                        environments,
                        source
                    );
                }
            },
            leave: (node) => {
                const envInfo =
                    match.anyEnvironment(node) &&
                    ownProperty(environments, printRaw(node.env));
                if (envInfo) {
                    processEnvironment(node, envInfo);
                }
            },
        },
        {
            includeArrays: true,
            startingContext: {
                inMathMode: startInMathMode,
                hasMathModeAncestor: startInMathMode,
            },
        }
    );

    // Now that the mode of all content is known, remove the whitespace in math mode
    // that the parser only kept in case the content turned out to be in text mode
    trimMathWhitespace(tree, {
        macros,
        environments,
        inMathMode: startInMathMode,
    });
}

/**
 * Reparse the arguments of `macro` that are not in the mode they were parsed in. Arguments
 * attached while processing were parsed in the mode the macro is used in, `inMathMode`.
 * If `attachedBefore` is true, `macro`'s arguments were attached before processing (e.g., by
 * `attachMacroArgs`, or because the tree was processed before), so it is not known what mode
 * they were parsed in and a heuristic is used to decide.
 */
function reparseMacroArgs(
    macro: Ast.Macro,
    inMathMode: boolean,
    attachedBefore: boolean,
    source?: string
) {
    for (const arg of macro.args || []) {
        const argInMathMode = argumentInMathMode(arg, macro, inMathMode);
        if (argInMathMode === inMathMode || arg.content.length === 0) {
            continue;
        }
        const parsedInWrongMode =
            !attachedBefore ||
            (argInMathMode
                ? !wasParsedInMathMode(arg.content)
                : !wasParsedInTextMode(arg.content));
        if (parsedInWrongMode) {
            arg.content = reparseInMode(
                arg.content,
                argInMathMode,
                source,
                argumentContentBounds(arg)
            );
        }
    }
}

/**
 * Environment bodies are always parsed in text mode (except for those hard-coded into the PEG
 * grammar, like `\begin{equation}...\end{equation}`, which are `mathenv`s). Reparse the
 * body in math mode if needed.
 */
function reparseEnvironmentBody(
    env: Ast.Environment,
    inMathMode: boolean,
    environments: EnvInfoRecord,
    source?: string
) {
    // An environment whose mode is recorded may have been processed before (e.g., if the
    // tree was processed before), but its mode may also have been recorded without reparsing
    // its body (e.g., by `processEnvironments`)
    const alreadyProcessed = env._renderInfo?.inMathMode != null;
    const envInfo = ownProperty(environments, printRaw(env.env));
    // The render info is needed by `visit` to determine the mode of the body
    // while the body is being processed. `processEnvironment` merges the same render info
    // again when leaving the environment; that is harmless, and is deliberately not
    // deduplicated, since `updateRenderInfo` lives in a package util-parse doesn't depend on.
    if (envInfo?.renderInfo) {
        env._renderInfo = { ...env._renderInfo, ...envInfo.renderInfo };
    }
    if (env.type !== "environment") {
        return;
    }
    const bodyInMathMode = env._renderInfo?.inMathMode ?? inMathMode;
    if (
        !bodyInMathMode ||
        (alreadyProcessed && wasParsedInMathMode(env.content))
    ) {
        return;
    }
    // Arguments are part of the body until they are attached. They should stay
    // parsed in text mode, so attach them first.
    if (envInfo) {
        attachEnvironmentArgs(env, envInfo);
    }
    env.content = reparseInMode(
        env.content,
        true,
        source,
        environmentContentBounds(env)
    );
    // Record that the body is in math mode, so it isn't reparsed if the tree is processed again.
    // The body of an unknown environment (like the arguments of an unknown macro) is parsed in
    // the mode it is used in, but may really be in text mode, so its mode is not recorded.
    if (envInfo) {
        env._renderInfo = { ...env._renderInfo, inMathMode: true };
    }
}
