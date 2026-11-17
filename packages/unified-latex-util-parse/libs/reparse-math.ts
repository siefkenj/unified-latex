import { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    ArgumentParser,
    EnvInfoRecord,
    MacroInfoRecord,
} from "@unified-latex/unified-latex-types";
import { gobbleArguments } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { ownProperty, withCtanInfo } from "./ctan-info";
import { processMacrosAndEnvironments } from "./process-macros-and-environments";
import {
    argumentContentBounds,
    environmentContentBounds,
    argumentInMathMode,
    Bounds,
    reparseInMode,
    wasParsedInMathMode,
} from "./reparse-in-mode";

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
          /**
           * Macros whose arguments are attached in reparsed content, in addition to those
           * from `@unified-latex/unified-latex-ctan`
           */
          macros?: MacroInfoRecord;
          /**
           * Environments whose arguments are attached in reparsed content, in addition to
           * those from `@unified-latex/unified-latex-ctan`
           */
          environments?: EnvInfoRecord;
      }
    | undefined;

/**
 * Reparse math environments/macro contents that should have been parsed in math mode but weren't.
 * Reparsed content has its macro arguments attached (and reparsed in the mode they are in)
 * the same way as when parsing.
 *
 * Content is reparsed from the source string (the `value` of the file being processed), so
 * the source should be provided (e.g., by using `processSync(str)` rather than `runSync(tree)`).
 * Without it, or if the content was changed after parsing, the content is printed and the
 * result is reparsed, which may give the wrong result. E.g., `\frac12 x` parsed in text
 * mode gives `\frac` the arguments `12` and `x`, which are printed as `\frac{12}{x}`.
 */
export const unifiedLatexReparseMath: Plugin<
    PluginOptions[],
    Ast.Root,
    Ast.Root
> = function unifiedLatexReparseMath(options) {
    const {
        mathEnvs = [],
        mathMacros = [],
        macros = {},
        environments = {},
    } = options || {};

    const isMathEnvironment = match.createEnvironmentMatcher(mathEnvs);
    const isMathMacro = match.createMacroMatcher(mathMacros);
    const { macros: allMacros, environments: allEnvironments } = withCtanInfo(
        macros,
        environments
    );
    // Reparsing only attaches arguments to macros and environments that it knows about, using
    // the signatures it knows. Arguments attached to others, or attached with a different
    // signature (e.g., by a parser that was given custom macros), would be lost.
    const hasArgsThatWouldBeLost = (nodes: Ast.Node[]) => {
        let ret = false;
        visit(nodes, (node) => {
            if (
                (match.anyMacro(node) &&
                    node.args?.length &&
                    argsWouldChange(
                        node.args,
                        ownProperty(allMacros, node.content)
                    )) ||
                (match.anyEnvironment(node) &&
                    node.args?.length &&
                    argsWouldChange(
                        node.args,
                        ownProperty(allEnvironments, printRaw(node.env))
                    ))
            ) {
                ret = true;
                return EXIT;
            }
        });
        return ret;
    };
    // Content that looks like it was parsed in math mode is still reparsed if it is known to have
    // been parsed in text mode, since the modes differ in other ways (e.g. whitespace and shorthand
    // arguments), unless that would lose arguments.
    const needsReparse = (nodes: Ast.Node[], inMathMode: boolean) =>
        nodes.length > 0 &&
        (!wasParsedInMathMode(nodes) ||
            (!inMathMode && !hasArgsThatWouldBeLost(nodes)));

    return (tree: Ast.Root, file?: { value?: unknown }) => {
        const source = typeof file?.value === "string" ? file.value : undefined;
        // The tree may have been parsed in math mode (e.g., by `parseMath`)
        const inMathMode =
            (tree._renderInfo as { inMathMode?: boolean } | undefined)
                ?.inMathMode === true;
        // Reparsing loses the arguments attached to macros, so they are attached again
        // (and reparsed in their own mode) just like when parsing
        const reparseAsMath = (nodes: Ast.Node[], bounds?: Bounds) => {
            const reparsed = reparseInMode(nodes, true, source, bounds);
            processMacrosAndEnvironments(reparsed, {
                macros: allMacros,
                environments: allEnvironments,
                source,
                inMathMode: true,
            });
            return reparsed;
        };

        visit(
            tree,
            (node, info) => {
                // Content is parsed in the mode it is in, except for the bodies of `environment`s
                // (but not `mathenv`s) that are not known to be math, which are parsed in text mode.
                // Content may also have been inserted after parsing (e.g., by expanding a macro), in which
                // case we check whether it looks like it was parsed in math mode.
                if (match.anyMacro(node)) {
                    for (const arg of node.args || []) {
                        // Arguments that are explicitly in text mode (e.g. a label) stay that way
                        if (arg._renderInfo?.inMathMode === false) {
                            continue;
                        }
                        if (
                            needsReparse(
                                arg.content,
                                argumentInMathMode(
                                    arg,
                                    node,
                                    !!info.context.inMathMode
                                )
                            )
                        ) {
                            arg.content = reparseAsMath(
                                arg.content,
                                argumentContentBounds(arg)
                            );
                        }
                        // Record the mode so that it is known when walking the tree (e.g. in `visit`)
                        arg._renderInfo = {
                            ...arg._renderInfo,
                            inMathMode: true,
                        };
                    }
                }
                if (match.anyEnvironment(node)) {
                    const bodyInMathMode =
                        node.type === "mathenv" ||
                        node._renderInfo?.inMathMode === true;
                    if (needsReparse(node.content, bodyInMathMode)) {
                        node.content = reparseAsMath(
                            node.content,
                            environmentContentBounds(node)
                        );
                    }
                    if (node.type === "environment") {
                        node._renderInfo = {
                            ...node._renderInfo,
                            inMathMode: true,
                        };
                    }
                }
            },
            {
                test: (node) => isMathEnvironment(node) || isMathMacro(node),
                startingContext: {
                    inMathMode,
                    hasMathModeAncestor: inMathMode,
                },
            }
        );
    };
};

/**
 * Whether attaching arguments as described by `info` to the content that `args` were
 * attached from would give different arguments than `args` (e.g., because `args` were
 * attached using a different signature).
 */
function argsWouldChange(
    args: Ast.Argument[],
    info: { signature?: string; argumentParser?: ArgumentParser } | undefined
): boolean {
    const signatureOrParser = info?.argumentParser || info?.signature;
    if (signatureOrParser == null) {
        return args.some(
            (arg) => arg.openMark || arg.closeMark || arg.content.length > 0
        );
    }
    const nodes = args.flatMap((arg): Ast.Node[] =>
        arg.openMark === "{" && arg.closeMark === "}"
            ? [{ type: "group", content: arg.content }]
            : [
                  ...(arg.openMark
                      ? [{ type: "string", content: arg.openMark } as const]
                      : []),
                  ...arg.content,
                  ...(arg.closeMark
                      ? [{ type: "string", content: arg.closeMark } as const]
                      : []),
              ]
    );
    const numNodes = nodes.length;
    const { args: reattached, nodesRemoved } = gobbleArguments(
        nodes,
        signatureOrParser
    );
    return (
        nodesRemoved !== numNodes ||
        reattached.length !== args.length ||
        reattached.some(
            (arg, i) =>
                arg.openMark !== args[i].openMark ||
                arg.closeMark !== args[i].closeMark ||
                printRaw(arg.content) !== printRaw(args[i].content)
        )
    );
}
