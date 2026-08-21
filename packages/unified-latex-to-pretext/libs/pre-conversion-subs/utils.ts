import * as Ast from "@unified-latex/unified-latex-types";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import { s } from "@unified-latex/unified-latex-builder";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { VFileMessage } from "vfile-message";

/**
 * Create a warning message about node from the given source file.
 */
export function makeWarningMessage(
    node: Ast.Node,
    message: string,
    warningType: string
): VFileMessage {
    const newMessage = new VFileMessage(message, node);

    newMessage.source = `unified-latex-to-pretext:${warningType}`;

    return newMessage;
}

/**
 * Create an empty Ast.String node, adding a warning message from
 * the source file into the VFile.
 */
export function emptyStringWithWarningFactory(
    warningMessage: string
): (node: Ast.Node, info: VisitInfo, file?: VFile) => Ast.String {
    return (node, info, file) => {
        // add a warning message
        if (file) {
            const message = makeWarningMessage(
                node,
                warningMessage,
                "macro-subs"
            );
            file.message(
                message,
                message.place,
                `unified-latex-to-pretext:macro-subs`
            );
        }

        return s("");
    };
}

/**
 * Get an environment's name as a plain string.
 *
 * `Ast.Environment["env"]` is typed as a `string`, but the parser only honors
 * that for text-mode environments; a `mathenv` carries an `Ast.String` node
 * instead. `printRaw` handles the node form but throws on a bare string, so
 * this normalizes both.
 */
export function getEnvName(env: Ast.Environment["env"]): string {
    return typeof env === "string" ? env : printRaw(env);
}

/**
 * Whether `nodes` contains anything that should actually render as content, as
 * opposed to only whitespace/comments/parbreaks or empty strings/groups left
 * behind by a dropped macro (see `dropped-subs.ts`).
 */
export function hasMeaningfulContent(nodes: Ast.Node[]): boolean {
    return nodes.some((node) => {
        if (
            match.comment(node) ||
            match.whitespace(node) ||
            match.parbreak(node)
        ) {
            return false;
        }
        if (node.type === "string") {
            return node.content.trim() !== "";
        }
        if (node.type === "group") {
            return hasMeaningfulContent(node.content);
        }
        return true;
    });
}

/**
 * Sanitize a string for use in xml:id attributes and corresponding refs.
 */
export function sanitizeXmlId(str: string) {
    return str.replace(/[^a-zA-Z0-9_-]/g, (match) => {
        switch (match) {
            case "&":
            case ":":
            case "/":
            case "\\":
                return "-";
            case " ":
            case "\t":
                return "_";
            default: return "";
        }
    });
}
