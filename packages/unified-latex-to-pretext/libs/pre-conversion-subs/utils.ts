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

/**
 * Attributes whose bare-number values are percentages. `width=50` is
 * normalized to `width="50%"` since a literal `%` starts a comment in LaTeX.
 */
const PERCENT_ATTRIBUTES = new Set(["width", "widths", "margin", "margins"]);

/**
 * Parse an optional argument as a comma-separated `key=value` list, e.g.
 * `[widths=30\% 70\%, valign=top]`. Values may be quoted; `\%` is unescaped
 * to `%`; bare-number values of percentage attributes get a `%` appended; a
 * bare key becomes `key="yes"`.
 */
export function parseKeyValueAttributes(
    nodes: Ast.Node[] | null
): Record<string, string> {
    const attributes: Record<string, string> = {};
    if (!nodes) {
        return attributes;
    }
    for (const entry of printRaw(nodes).split(",")) {
        const keyValue = entry.trim();
        if (!keyValue) {
            continue;
        }
        const eqIndex = keyValue.indexOf("=");
        if (eqIndex === -1) {
            attributes[keyValue] = "yes";
            continue;
        }
        const key = keyValue.slice(0, eqIndex).trim();
        let value = keyValue.slice(eqIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        value = value.replace(/\\%/g, "%");
        if (PERCENT_ATTRIBUTES.has(key) && /^\d+(\.\d+)?$/.test(value)) {
            value += "%";
        }
        if (key) {
            attributes[key] = value;
        }
    }
    return attributes;
}
