import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { ArgumentParser } from "@unified-latex/unified-latex-types";
import {
    ArgSpecAst as ArgSpec,
    parse as parseArgspec,
} from "@unified-latex/unified-latex-util-argspec";
import { gobbleSingleArgument } from "./gobble-single-argument";

/**
 * Gobbles an argument of whose type is specified
 * by `argSpec` starting at the position `startPos`. If an argument couldn't be found,
 * `argument` will be `null`.
 */
export function gobbleArguments(
    nodes: Ast.Node[],
    argSpec: string | ArgSpec.Node[] | ArgumentParser,
    startPos = 0
): {
    args: Ast.Argument[];
    nodesRemoved: number;
} {
    if (typeof argSpec === "function") {
        return argSpec(nodes, startPos);
    }

    if (typeof argSpec === "string") {
        argSpec = parseArgspec(argSpec);
    }

    const args: Ast.Argument[] = [];
    let nodesRemoved = 0;

    for (const spec of argSpec) {
        if (spec.type === "embellishment") {
            // We need special behavior for embellishment argspecs.
            // Because an embellishment argspec specifies more than one argument,
            // we need to keep gobbling arguments until we've got them all.
            const { embellishmentTokens, embellishmentDefaultArg } = spec;

            const remainingTokens = new Set<string>();
            const tokenToArgs = new Map<string, Ast.Argument>();

            for (let i = 0, l = embellishmentTokens.length; i < l; i++) {
                const token = embellishmentTokens[i];
                // We assume that there aren't any duplicates in embellishmentTokens.
                // Otherwise this may yield unexpected results.
                remainingTokens.add(token);
                const suppliedDefaultArg = embellishmentDefaultArg?.[i];
                tokenToArgs.set(
                    token,
                    suppliedDefaultArg
                        ? arg(suppliedDefaultArg, {
                              openMark: token,
                              closeMark: "",
                          })
                        : emptyArg()
                );
            }

            for (;;) {
                let { argument, nodesRemoved: removed } = gobbleSingleArgument(
                    nodes,
                    embellishmentSpec(remainingTokens),
                    startPos
                );
                if (!argument) {
                    break;
                }
                const token = argument.openMark;
                remainingTokens.delete(token);
                tokenToArgs.set(token, argument);
                nodesRemoved += removed;
            }

            args.push(
                ...spec.embellishmentTokens.map((t) => tokenToArgs.get(t)!)
            );
        } else {
            const { argument, nodesRemoved: removed } = gobbleSingleArgument(
                nodes,
                spec,
                startPos
            );
            args.push(argument || emptyArg());
            nodesRemoved += removed;
        }
    }

    return { args, nodesRemoved };
}

/**
 * Create an embellishment argspec from a set of tokens.
 */
function embellishmentSpec(tokens: Set<string>): ArgSpec.Embellishment {
    return {
        type: "embellishment",
        embellishmentTokens: [...tokens],
    };
}

/**
 * Create an empty argument.
 */
function emptyArg(): Ast.Argument {
    return arg([], { openMark: "", closeMark: "" });
}
