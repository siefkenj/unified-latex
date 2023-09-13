import {
    ArgSpecAst as ArgSpec,
    parse as parseArgspec,
} from "@unified-latex/unified-latex-util-argspec";
import * as Ast from "@unified-latex/unified-latex-types";
import { arg } from "@unified-latex/unified-latex-builder";
import { gobbleSingleArgument } from "./gobble-single-argument";
import { ArgumentParser } from "@unified-latex/unified-latex-types";

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
        const { argument, nodesRemoved: removed } = gobbleSingleArgument(
            nodes,
            spec,
            startPos
        );
        if (argument) {
            if (Array.isArray(argument)) {
                args.push(...argument);
            } else {
                args.push(argument);
            }
            nodesRemoved += removed;
        } else {
            args.push(arg([], { openMark: "", closeMark: "" }));
        }
    }

    return { args, nodesRemoved };
}
