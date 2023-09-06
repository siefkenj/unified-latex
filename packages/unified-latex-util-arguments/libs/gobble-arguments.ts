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
                args.push(...argument)
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

// Embelishment tokens must consist of distinct single characters.
// Each characters can be braced once, `e{{^}}` works but `e{{{^}}}` doesn't
// (xparse thinks {^} is a delimiter in this case and emits an error)
// This function expands embelishment argspec to several ones for each embelishment
// token, so that a single ArgSpec object represents a single argument.
// Currently this does not handle `defaultArg`, because we don't handle it in
// attachArgs anyway.
function splitEmbellishmentArgs(argSpec: ArgSpec.Node[]) {
    let i = 0;
    do {
        const spec = argSpec[i];
        if (typeof spec === "string" || spec.type !== "embellishment") {
            i++;
            continue;
        }
        const tokens = flattenEmbellishmentTokens(spec.embellishmentTokens);
        argSpec.splice(i, 1, ...tokens.map(token => {
            return {
                type: "embellishment",
                embellishmentTokens: [token],
                openBrace: "",
                closeBrace: ""
            } as ArgSpec.Embellishment
        }));
        i += tokens.length;
    } while (i < argSpec.length)
}
function flattenEmbellishmentTokens(tokens: (ArgSpec.Group | string)[]): string[] {
    return tokens.flatMap(token => {
        if (typeof token === 'string') {
            return token.split('');
        }
        // xparse only recurse one level deep, and more than that is an error.
        // We assume that the input is a valid xparse signature, so we recurse
        // arbitrarily.
        return flattenEmbellishmentTokens(token.content)
    });
}
export function stringifyGroup(group: ArgSpec.Group): string {
    return '{' + group.content.map(content => {
        if (typeof content === 'string') return content;
        return stringifyGroup(content);
    }).join('') + '}';
}