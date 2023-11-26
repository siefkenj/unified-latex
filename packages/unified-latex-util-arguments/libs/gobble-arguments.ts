import { structuredClone } from "@unified-latex/structured-clone";
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

    // argSpec may be mutated below.
    argSpec = structuredClone(argSpec);

    const args: Ast.Argument[] = [];
    let totalNodesRemoved = 0;

    for (const spec of argSpec) {
        const innerArgs: Ast.Argument[] = [];
        let argument: Ast.Argument | null;
        let nodesRemoved: number, matchNum: number | undefined;
        do {
            ({ argument, nodesRemoved, matchNum } = gobbleSingleArgument(
                nodes,
                spec,
                startPos
            ));
            if (argument) {
                innerArgs[nthHoleIndex(innerArgs, matchNum || 1)] = argument;
                totalNodesRemoved += nodesRemoved;
            }
            // Usual ArgSpec ends this loop by returning `matchNum === undefined`.
            // Embellishment argspecs always return matchNum. They end this loop
            // by returning falsy `argument` value.
        } while (argument && matchNum !== undefined);

        // Fill out missing arguments.
        if (matchNum === undefined) {
            matchNum = argument ? 0 : 1;
        }
        let i = -1;
        while (matchNum--) {
            i = nextHoleIndex(innerArgs, i);
            innerArgs[i] = arg([], { openMark: "", closeMark: "" });
        }
        args.push(...innerArgs);
    }

    return { args, nodesRemoved: totalNodesRemoved };
}

function nextHoleIndex<T>(
    arr: (NonNullable<T> | undefined)[],
    startPos: number
) {
    do {
        startPos++;
    } while (typeof arr[startPos] !== "undefined");
    return startPos;
}
/**
 * Get n-th left-most hole in `arr`. `n` is a 1-based integer,
 * so putting ([], 1) would return 0.
 */
function nthHoleIndex<T>(arr: (NonNullable<T> | undefined)[], n: number) {
    let i = -1;
    while (n--) {
        i = nextHoleIndex(arr, i);
    }
    return i;
}
