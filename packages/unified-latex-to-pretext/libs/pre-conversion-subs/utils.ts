import * as Ast from "@unified-latex/unified-latex-types";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import { s } from "@unified-latex/unified-latex-builder";
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
