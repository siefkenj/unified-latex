/* eslint-disable no-fallthrough */
import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    ArgSpecAst as ArgSpec,
    printRaw,
} from "@unified-latex/unified-latex-util-argspec";
import { match } from "@unified-latex/unified-latex-util-match";
import { scan } from "@unified-latex/unified-latex-util-scan";

/**
 * Gobbles an argument of whose type is specified
 * by `argSpec` starting at the position `startPos`.
 * If an argument couldn't be found, `argument` will be `null`.
 */
export function gobbleSingleArgument(
    nodes: Ast.Node[],
    argSpec: ArgSpec.Node,
    startPos = 0
): {
    argument: Ast.Argument | null;
    nodesRemoved: number;
} {
    if (typeof argSpec === "string" || !argSpec.type) {
        throw new Error(
            `argSpec must be an already-parsed argument specification, not "${JSON.stringify(
                argSpec
            )}"`
        );
    }

    let argument: Ast.Argument | null = null;

    let currPos = startPos;

    // Gobble whitespace from `currPos` onward, updating `currPos`.
    // If `argSpec` specifies leading whitespace is not allowed,
    // this function does nothing.
    const gobbleWhitespace = argSpec.noLeadingWhitespace
        ? () => {}
        : () => {
              while (currPos < nodes.length) {
                  if (!match.whitespace(nodes[currPos])) {
                      break;
                  }
                  currPos++;
              }
          };

    const openMark = parseToken(argSpec.openBrace);
    const closeMark = parseToken(argSpec.closeBrace);

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
        currNode != null &&
        !match.comment(currNode) &&
        !match.parbreak(currNode)
    ) {
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
                    const bracePos = findBracePositions(
                        nodes,
                        currPos,
                        openMark,
                        closeMark
                    );
                    if (bracePos) {
                        argument = arg(
                            nodes.slice(bracePos[0] + 1, bracePos[1]),
                            {
                                openMark: argSpec.openBrace,
                                closeMark: argSpec.closeBrace,
                            }
                        );
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
                const bracePos = findBracePositions(
                    nodes,
                    currPos,
                    openMark,
                    closeMark
                );
                if (bracePos) {
                    argument = arg(nodes.slice(bracePos[0] + 1, bracePos[1]), {
                        openMark: argSpec.openBrace,
                        closeMark: argSpec.closeBrace,
                    });
                    currPos = bracePos[1] + 1;
                }
                break;
            case "optionalStar":
            case "optionalToken": {
                const bracePos = findBracePositions(
                    nodes,
                    currPos,
                    argSpec.type === "optionalStar" ? "*" : argSpec.token
                );
                if (bracePos) {
                    argument = arg(currNode, { openMark: "", closeMark: "" });
                    // Instead of `closeMarkPos` returned from findBracePositions,
                    // one should use `openMarkPos + ` because there's no argument
                    currPos = bracePos[0] + 1;
                }
                break;
            }
            case "until": {
                const stopTokens = argSpec.stopTokens.map(parseToken);
                // TODO: in order to match xparse's behavior, multiple spaces at the start
                // or in a middle should be collapsed to a single whitespace token,
                // and spaces at the end should be ignored.
                let nextStartPos = startPos;
                let bracePos: [number, number] | undefined;
                while (nextStartPos < nodes.length) {
                    bracePos = findBracePositions(
                        nodes,
                        nextStartPos,
                        undefined,
                        stopTokens[0]
                    );
                    if (!bracePos) {
                        break;
                    }
                    let nextBracePos: [number, number] | undefined = bracePos;
                    let i = 1;
                    for (; i < stopTokens.length && nextBracePos; i++) {
                        nextBracePos = findBracePositions(
                            nodes,
                            nextBracePos[1] + 1,
                            undefined,
                            stopTokens[i],
                            /* endPos */ nextBracePos[1] + 1
                        );
                    }
                    if (i >= stopTokens.length && nextBracePos) {
                        break;
                    }
                    nextStartPos = bracePos[0] + 1;
                }

                // If the corresponding token is not found, eat nothing;
                if (!bracePos) {
                    break;
                }

                argument = arg(nodes.slice(startPos, bracePos[1]), {
                    openMark: "",
                    closeMark: printRaw(argSpec.stopTokens),
                });
                // Since `stopTokens` may comprise of more than one token,
                // we need to advance `currPos` further
                currPos = bracePos[1] + stopTokens.length - 1;
                if (currPos < nodes.length) {
                    currPos++;
                }
                break;
            }
            case "embellishment": {
                for (const token of argSpec.embellishmentTokens) {
                    const bracePos = findBracePositions(nodes, currPos, token);
                    if (!bracePos) {
                        continue;
                    }
                    let argNode = nodes[bracePos[0] + 1];
                    argument = arg(
                        match.group(argNode) ? argNode.content : argNode,
                        {
                            openMark: token,
                            closeMark: "",
                        }
                    );
                    currPos = bracePos[1] + 1;
                    break;
                }
                break;
            }
            default:
                console.warn(
                    `Don't know how to find an argument of argspec type "${argSpec.type}"`
                );
        }
    }

    // `currPos` has already stepped past any whitespace. However,
    // if we did not consume an argument, we don't want to consume the whitespace.
    let nodesRemoved: number;
    if (argument == null) {
        nodesRemoved = 0;
    } else {
        nodesRemoved = currPos - startPos;
        nodes.splice(startPos, nodesRemoved);
    }
    return { argument, nodesRemoved };
}

function cloneStringNode(node: Ast.String, content: string): Ast.String {
    return Object.assign({}, node, { content });
}

type Braces = string | Ast.Macro | Ast.Whitespace;
/**
 * Find the position of the open brace and the closing brace.
 * Returns undefined if the brace isn't found.
 * This may mutate `nodes`, if braces are not a kind of characters that are
 * always parsed as a separate token
 */
function findBracePositions(
    nodes: Ast.Node[],
    startPos: number,
    openMark?: Braces,
    closeMark?: Braces,
    endPos?: number
): [number, number] | undefined {
    let openMarkPos: number | undefined = startPos;
    let closeMarkPos: number | undefined = startPos;
    if (openMark) {
        openMarkPos = findDelimiter(nodes, openMark, openMarkPos, openMarkPos);
        if (openMarkPos === undefined) {
            return;
        }
        closeMarkPos = openMarkPos + 1;
    }
    if (!closeMark) {
        // In such a case, the token immediately preceding the opening brace
        // will be treated as an argument. If the next token is a string node,
        // only its first character is picked up.
        const argNode = nodes[closeMarkPos];
        if (!argNode) {
            return;
        }
        if (match.anyString(argNode) && argNode.content.length > 1) {
            const argContent = argNode.content;
            argNode.content = argContent[0];
            nodes.splice(
                closeMarkPos + 1,
                0,
                cloneStringNode(argNode, argContent.slice(1))
            );
        }
        return [openMarkPos, closeMarkPos];
    }
    closeMarkPos = findDelimiter(nodes, closeMark, closeMarkPos, endPos);
    if (closeMarkPos === undefined) {
        return;
    }
    return [openMarkPos, closeMarkPos];
}

function findDelimiter(
    nodes: Ast.Node[],
    token: Braces,
    startPos: number,
    endPos?: number
): number | undefined {
    let closeMarkPos = scan(nodes, token, {
        startIndex: startPos,
        allowSubstringMatches: true,
        endIndex: endPos,
    });
    if (closeMarkPos === null) {
        return;
    }
    const closingNode = nodes[closeMarkPos];
    if (match.anyString(closingNode) && typeof token === "string") {
        const closingNodeContent = closingNode.content;
        let closeMarkIndex = closingNodeContent.indexOf(token);
        if (closingNodeContent.length > token.length) {
            // `nodes` should be mutated in case of substring matches
            const prev = closingNodeContent.slice(0, closeMarkIndex);
            if (prev) {
                // `closeMarkPos` need to be increased, so double-check that we are bounded by
                // `endPos` before mutating `nodes`. `closeMarkPos` is already less than or equal to `endPos`,
                // so we only need to check for an equality here.
                if (closeMarkPos === endPos) {
                    return;
                }
                nodes.splice(
                    closeMarkPos,
                    0,
                    cloneStringNode(closingNode, prev)
                );
                closeMarkPos++;
            }
            closingNode.content = token;
            const next = closingNodeContent.slice(
                closeMarkIndex + token.length
            );
            if (next) {
                nodes.splice(
                    closeMarkPos + 1,
                    0,
                    cloneStringNode(closingNode, next)
                );
            }
        }
    }
    return closeMarkPos;
}

function parseToken(
    str: string | undefined
): string | Ast.Whitespace | Ast.Macro {
    if (!str) {
        return "";
    }
    if (!str.trim()) {
        return { type: "whitespace" };
    }
    if (str.startsWith("\\")) {
        return { type: "macro", content: str.slice(1) };
    }
    return str;
}
