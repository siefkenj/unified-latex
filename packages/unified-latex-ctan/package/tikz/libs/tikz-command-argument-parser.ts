import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    ArgSpecAst as ArgSpec,
    parse as parseArgspec,
} from "@unified-latex/unified-latex-util-argspec";
import { Argument, ArgumentParser } from "@unified-latex/unified-latex-types";
import { gobbleSingleArgument } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { scan } from "@unified-latex/unified-latex-util-scan";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

const OPTIONAL_ARGUMENT_ARG_SPEC = parseArgspec("o")[0];

function blankArg() {
    return arg([], { openMark: "", closeMark: "" });
}

/**
 * Find the arguments of a tikz command. Many tikz commands accept either
 * the a group as their only argument, or they scan their arguments until the first
 * `;` is found.
 *
 * This behavior cannot be achieved via a standard xparse spec.
 */
export const tikzCommandArgumentParser: ArgumentParser = (nodes, startPos) => {
    const origStartPos = startPos;
    let pos = startPos;
    let nodesRemoved = 0;

    const cursorPosAfterAnimations = eatAllAnimationSpecs(nodes, pos);
    let animationArg = blankArg();
    if (cursorPosAfterAnimations !== pos) {
        const argContent = nodes.splice(pos, cursorPosAfterAnimations - pos);
        trim(argContent);
        animationArg = arg(argContent, {
            openMark: " ",
            closeMark: " ",
        });
    }
    nodesRemoved += cursorPosAfterAnimations - pos;

    const {
        argument: _optionalArgument,
        nodesRemoved: optionalArgumentNodesRemoved,
    } = gobbleSingleArgument(nodes, OPTIONAL_ARGUMENT_ARG_SPEC, pos) as {
        argument: Argument;
        nodesRemoved: number;
    };
    nodesRemoved += optionalArgumentNodesRemoved;
    const optionalArg = _optionalArgument || blankArg();

    // Eat whitespace
    while (match.whitespace(nodes[pos])) {
        pos++;
    }
    const firstNode = nodes[pos];

    // If we're past the end of the array, give up.
    if (!firstNode) {
        return {
            args: [animationArg, optionalArg, blankArg()],
            nodesRemoved: 0,
        };
    }

    // If we're a group, grab the contents and call it good.
    if (match.group(firstNode)) {
        const args = [animationArg, optionalArg, arg(firstNode.content)];
        nodes.splice(origStartPos, pos - origStartPos + 1);
        return { args, nodesRemoved: pos - origStartPos + 1 + nodesRemoved };
    }

    // No group, so scan for a semicolon.
    const semicolonPosition = scan(nodes, ";", { startIndex: pos });
    if (semicolonPosition != null) {
        const argNodes = nodes.splice(
            origStartPos,
            semicolonPosition - origStartPos + 1
        );
        trim(argNodes);
        const args = [animationArg, optionalArg, arg(argNodes)];
        return {
            args,
            nodesRemoved: origStartPos - semicolonPosition + 1 + nodesRemoved,
        };
    }

    // If there was no semicolon, give up.
    return {
        args: [animationArg, optionalArg, blankArg()],
        nodesRemoved: 0,
    };
};

/**
 * Find the next index after all animation specs. If no animation specs are present,
 * return `startPos`.
 *
 * An animation spec looks like
 * ```
 * :rotate = { 0s="0", 2s="90", begin on=click }
 * ```
 * Any number can be listed. They start with a colon and have an equals sign followed by a group.
 */
function eatAllAnimationSpecs(nodes: Ast.Node[], startPos: number): number {
    const colonPos = scan(nodes, ":", {
        startIndex: startPos,
        allowSubstringMatches: true,
        onlySkipWhitespaceAndComments: true,
    });

    if (!colonPos) {
        return startPos;
    }

    let lastMatchPos = startPos;
    let i = colonPos + 1;
    for (; i < nodes.length; i++) {
        const node = nodes[i];
        if (match.string(node, "[")) {
            // XXX As per the tikz manual, we stop scanning if we find an open square brace.
            break;
        }
        if (match.string(node, "=")) {
            i++;
            // Look for a group next
            while (match.whitespace(nodes[i]) || match.comment(nodes[i])) {
                i++;
            }
            if (!match.group(nodes[i])) {
                break;
            }
            // We have a match!
            lastMatchPos = i + 1;

            // Start the process again
            const colonPos = scan(nodes, ":", {
                startIndex: lastMatchPos,
                allowSubstringMatches: true,
                onlySkipWhitespaceAndComments: true,
            });
            if (colonPos == null) {
                break;
            }
            i = colonPos + 1;
        }
    }

    return lastMatchPos;
}
