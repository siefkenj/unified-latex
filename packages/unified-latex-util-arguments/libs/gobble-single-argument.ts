import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { ArgSpecAst as ArgSpec, printRaw } from "@unified-latex/unified-latex-util-argspec";
import { match } from "@unified-latex/unified-latex-util-match";
import { scan } from "@unified-latex/unified-latex-util-scan";

/**
 * Gobbles an argument of whose type is specified
 * by `argSpec` starting at the position `startPos`. If an argument couldn't be found,
 * `argument` will be `null`.
 */
export function gobbleSingleArgument(
    nodes: Ast.Node[],
    argSpec: ArgSpec.Node,
    startPos = 0
): {
    argument: Ast.Argument | Ast.Argument[] | null;
    nodesRemoved: number;
} {
    if (typeof argSpec === "string" || !argSpec.type) {
        throw new Error(
            `argSpec must be an already-parsed argument specification, not "${JSON.stringify(
                argSpec
            )}"`
        );
    }

    let argument: Ast.Argument | Ast.Argument[] | null = null;

    let currPos = startPos;

    // Gobble whitespace from `currPos` onward, updating `currPos`.
    // If `argSpec` specifies leading whitespace is not allowed,
    // this function does nothing.
    const gobbleWhitespace = (argSpec as ArgSpec.LeadingWhitespace)
        .noLeadingWhitespace
        ? () => { }
        : () => {
            while (currPos < nodes.length) {
                if (!match.whitespace(nodes[currPos])) {
                    break;
                }
                currPos++;
            }
        };

    const openMark: string = (argSpec as any).openBrace || "";
    const closeMark: string = (argSpec as any).closeBrace || "";

    // Only mandatory arguments can be wrapped in {...}.
    // Since we already parse such things as groups, we need to
    // check the open and closing symbols to see if we allow for
    // groups to be accepted as arguments
    const acceptGroup =
        (argSpec.type === "mandatory" || argSpec.type === "optional") &&
        openMark === "{" &&
        closeMark === "}";

    // Do the actual matching
    gobbleWhitespace();
    const currNode = nodes[currPos];
    if (
        currNode == null ||
        match.comment(currNode) ||
        match.parbreak(currNode)
    ) {
        return { argument, nodesRemoved: 0 };
    }

    switch (argSpec.type) {
        case "mandatory":
            if (acceptGroup) {
                // We have already gobbled whitespace, so at this point, `currNode`
                // is either an openMark or we don't have an optional argument.
                let content: Ast.Node[] = [currNode];
                if (match.group(currNode)) {
                    // Unwrap a group if there is one.
                    content = currNode.content;
                }
                argument = arg(content, {
                    openMark,
                    closeMark,
                });
                currPos++;
                break;
            } else {
                const bracePos = findBracePositions(nodes, currPos, openMark, closeMark);
                if (bracePos) {
                    argument = arg(nodes.slice(bracePos[0] + 1, bracePos[1]), {
                        openMark,
                        closeMark,
                    });
                    currPos = bracePos[1] + 1;
                    break;
                }
            }
        // NOTE: Fallthrough is on purpose.
        // Matching a mandatory argument and an optional argument is the same for our purposes
        // because we're not going to fail to parse because of a missing argument.
        case "optional":
            // It is possible that an optional argument accepts a group if its open/close braces are `{}`
            if (acceptGroup && match.group(currNode)) {
                argument = arg(currNode.content, {
                    openMark,
                    closeMark,
                });
                currPos++;
                break;
            }
            // If we're here, we have custom braces to match
            const bracePos = findBracePositions(nodes, currPos, openMark, closeMark);
            if (bracePos) {
                argument = arg(nodes.slice(bracePos[0] + 1, bracePos[1]), {
                    openMark,
                    closeMark,
                });
                currPos = bracePos[1] + 1;
                break;
            }
            break;
        case "optionalStar":
        case "optionalToken":
            if (
                match.string(
                    currNode,
                    argSpec.type === "optionalStar" ? "*" : argSpec.token
                )
            ) {
                argument = arg([currNode], { openMark: "", closeMark: "" });
                currPos++;
                break;
            }
            break;
        case "until": {
            if (argSpec.stopTokens.length > 1) {
                console.warn(
                    `"until" matches with multi-token stop conditions are not yet implemented`
                );
                break;
            }
            const rawToken = argSpec.stopTokens[0];
            const stopToken: Ast.String | Ast.Whitespace =
                rawToken === " "
                    ? { type: "whitespace" }
                    : { type: "string", content: argSpec.stopTokens[0] };
            let matchPos = scan(nodes, stopToken, {
                startIndex: startPos,
                allowSubstringMatches: true,
            });
            if (
                matchPos != null &&
                partialStringMatch(nodes[matchPos], stopToken)
            ) {
                console.warn(
                    `"until" arguments that stop at non-punctuation symbols is not yet implemented`
                );
                break;
            }
            // If the corresponding token is not found, eat nothing;
            if (matchPos == null) {
                break;
            }
            argument = arg(nodes.slice(startPos, matchPos), {
                openMark: "",
                closeMark: rawToken,
            });
            currPos = matchPos;
            if (currPos < nodes.length) {
                currPos++;
            }
            break;
        }
        case "embellishment": {
            // Split tokens into single characters
            const tokens = normalizeEmbellishmentTokens(argSpec.embellishmentTokens);
            argument = [];
            let hasMatch: boolean;
            do { // Try finding match until there is no more
                hasMatch = false;
                for (let i = 0; i < tokens.length; i++) {
                    if (argument[i]) continue;
                    const token = tokens[i];
                    const bracePos = findBracePositions(nodes, currPos, token);
                    if (!bracePos) continue;
                    let argNode = nodes[bracePos[0] + 1];
                    argument[i] = arg(match.group(argNode) ? argNode.content : argNode, {
                        openMark: token,
                        closeMark: ""
                    });
                    currPos = bracePos[1] + 1;
                    hasMatch = true;
                    break;
                }
            } while (hasMatch);
            // Fill out missing arguments
            for (let i = 0; i < tokens.length; i++) {
                if (argument[i]) continue;
                argument[i] = arg([], { openMark: "", closeMark: "" });
            }
            break;
        }
        default:
            console.warn(
                `Don't know how to find an argument of argspec type "${argSpec.type}"`
            );
    }

    // `currPos` is has already stepped past any whitespace. However,
    // if we did not consume an argument, we don't want to consume the whitespace.
    const nodesRemoved = argument ? currPos - startPos : 0;
    nodes.splice(startPos, nodesRemoved);
    return { argument, nodesRemoved };
}

/**
 * Returns whether the presumed match "node" contains "token" as a strict
 * substring.
 */
function partialStringMatch(node: Ast.Node, token: Ast.Node): boolean {
    return (
        match.anyString(node) &&
        match.anyString(token) &&
        node.content.length > token.content.length
    );
}

function cloneStringNode(node: Ast.String, content: string): Ast.String {
    return Object.assign({}, node, { content });
}

/**
 * Find the position of the open brace and the closing brace.
 * Returns undefined if the brace isn't found.
 * This may mutate `nodes`, if braces are not a kind of characters that are
 * always parsed as a separate token
 */
function findBracePositions(nodes: Ast.Node[], startPos: number,
    openMark: string, closeMark?: string): [number, number] | undefined {
    const currNode = nodes[startPos];
    if (!openMark || !match.anyString(currNode)) return;
    const nodeContent = currNode.content;
    // The first node we encounter must contain the opening brace.
    if (!nodeContent.startsWith(openMark)) return;
    const openMarkPos = startPos;
    if (currNode.content.length > openMark.length) {
        const nodeContent = currNode.content;
        currNode.content = openMark;
        nodes.splice(openMarkPos + 1, 0,
            cloneStringNode(currNode, nodeContent.slice(openMark.length))
        );
    }
    if (!closeMark) {
        // In such a case, the token immediately preceding the opening brace
        // will be treated as an argument. If the next token is a string node,
        // only its first character is picked up.
        let closeMarkPos = openMarkPos + 1;
        const argNode = nodes[closeMarkPos];
        if (!argNode) return;
        if (match.anyString(argNode) && argNode.content.length > 1) {
            const argContent = argNode.content;
            argNode.content = argContent[0];
            nodes.splice(closeMarkPos + 1, 0, cloneStringNode(argNode, argContent.slice(1)));
        }
        return [openMarkPos, closeMarkPos];
    }
    for (let i = openMarkPos + 1; i < nodes.length; i++) {
        const node = nodes[i];
        if (!match.anyString(node)) continue;
        const nodeContent = node.content;
        let closeMarkIndex = nodeContent.indexOf(closeMark);
        if (closeMarkIndex === -1) continue;
        // Found a closeMark, store its index to `closeMarkPos`
        let closeMarkPos = i;
        if (nodeContent.length > closeMark.length) {
            node.content = closeMark;
            let prev = nodeContent.slice(0, closeMarkIndex);
            let next = nodeContent.slice(closeMarkIndex + closeMark.length);
            if (prev) {
                nodes.splice(closeMarkPos, 0, cloneStringNode(node, prev));
                closeMarkPos++;
            }
            if (next) {
                nodes.splice(closeMarkPos + 1, 0, cloneStringNode(node, next));
            }
        }
        return [openMarkPos, closeMarkPos];
    }
}

function normalizeEmbellishmentTokens(tokens: (ArgSpec.Group | string)[]): string[] {
    return tokens.flatMap(token => {
        if (typeof token === 'string') return token.split('');
        // xparse (as of 2023-02-02) accepts single character enclosed in braces {}.
        // It does not allow more nesting, e.g. e{{{_}}} produces an error.
        if (token.content.length === 1) {
            const bracedToken = token.content[0];
            if (typeof bracedToken === 'string' && bracedToken.length === 1) {
                return bracedToken;
            }
        }
        console.warn(
            `Embellishment token should be a single character, but got ${printRaw(token)}`
        );
        return [];
    });
}