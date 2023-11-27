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
            const remainingTokens = new Set(spec.embellishmentTokens);
            const argForToken = Object.fromEntries(
                spec.embellishmentTokens.map((t) => [t, emptyArg()])
            );

            let { argument, nodesRemoved: removed } = gobbleSingleArgument(
                nodes,
                embellishmentSpec(remainingTokens),
                startPos
            );
            while (argument) {
                const token = argument.openMark;
                remainingTokens.delete(token);
                argForToken[token] = argument;
                nodesRemoved += removed;
                const newSpec = embellishmentSpec(remainingTokens);
                ({ argument, nodesRemoved: removed } = gobbleSingleArgument(
                    nodes,
                    newSpec,
                    startPos
                ));
            }

            args.push(...spec.embellishmentTokens.map((t) => argForToken[t]));
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
