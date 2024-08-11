import * as Ast from "@unified-latex/unified-latex-types";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "unified-lint-rule/lib";
import { s } from "@unified-latex/unified-latex-builder";
import { VFileMessage } from "vfile-message";

/**
 * Create a warning message about node from the given source file.
 */
export function makeWarningMessage(
    node: Ast.Node,
    message: string,
    sourceFile: string
): VFileMessage {
    const newMessage = new VFileMessage(message, node);

    newMessage.source = `latex-to-pretext:${sourceFile}`;

    return newMessage;
}

/**
 * Create an empty Ast.String node, adding a warning message from
 * the source file into the VFile.
 */
export function emptyStringWithWarning(
    warningMessage: string,
    sourceFile: string
): (node: Ast.Node, info: VisitInfo, file?: VFile) => Ast.String {
    return (node, info, file) => {
        // add a warning message
        if (file) {
            const message = makeWarningMessage(
                node,
                warningMessage,
                sourceFile
            );
            file.message(
                message,
                message.position,
                `unified-latex-to-pretext:${sourceFile}` // might not work like it doesn't in creat warning message
            );
        }

        return s("");
    };
}
