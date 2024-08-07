import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "unified-lint-rule/lib";
import { s } from "@unified-latex/unified-latex-builder";
import { VFileMessage } from "vfile-message";

/**
 * Factory function that generates html-like macros that wrap their contents.
 */
function factory(
    tag: string,
    isWarn = false,
    attributes?: Record<string, string>
): (macro: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Macro {
    return (macro, info, file) => {
        if (!macro.args) {
            throw new Error(
                `Found macro to replace but couldn't find content ${printRaw(
                    macro
                )}`
            );
        }

        // add a warning message to the file if needed
        if (isWarn && file) {
            const message = createMessage(macro, tag);
            file.message(
                message,
                message.position,
                "unified-latex-to-pretext:macro-subs"
            );
        }

        // Assume the meaningful argument is the last argument. This
        // ensures that we can convert for default packages as well as
        // packages like beamer, which may add optional arguments.
        const args = getArgsContent(macro);
        const content = args[args.length - 1] || [];
        return htmlLike({ tag, content, attributes });
    };
}

function createMessage(node: Ast.Macro, replacement: string): VFileMessage {
    const message = new VFileMessage(
        `Warning: There is no equivalent tag for \"${node.content}\", \"${replacement}\" was used as a replacement.`
    );

    // add the position of the macro if available
    if (node.position) {
        message.line = node.position.start.line;
        message.column = node.position.start.column;
        message.position = {
            start: {
                line: node.position.start.line,
                column: node.position.start.column,
            },
            end: {
                line: node.position.end.line,
                column: node.position.end.column,
            },
        };
    }

    message.source = "latex-to-pretext:warning";
    return message;
}

function createHeading(tag: string, attrs = {}) {
    return (macro: Ast.Macro) => {
        const args = getArgsContent(macro);
        // const starred = !!args[0];
        const attributes: Record<string, string> = {};

        if (attrs) {
            Object.assign(attributes, attrs);
        }

        return htmlLike({
            tag,
            content: args[args.length - 1] || [],
            attributes,
        });
    };
}

function createEmptyString(): (
    macro: Ast.Macro,
    info: VisitInfo,
    file?: VFile
) => Ast.String {
    return (macro, info, file) => {
        // add a warning message
        if (file) {
            const message = createMessage(macro, "an empty Ast.String");
            file.message(
                message,
                message.position,
                "unified-latex-to-pretext:macro-subs"
            );
        }

        return s("");
    };
}

export const macroReplacements: Record<
    string,
    (node: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node
> = {
    emph: factory("em"),
    textrm: factory("em", true),
    textsf: factory("em", true),
    texttt: factory("em", true),
    textsl: factory("em", true),
    textit: factory("em"),
    textbf: factory("alert"),
    underline: factory("em", true),
    mbox: createEmptyString(),
    phantom: createEmptyString(),
    appendix: createHeading("appendix"),
    url: (node) => {
        const args = getArgsContent(node);
        const url = printRaw(args[0] || "#");
        return htmlLike({
            tag: "url",
            attributes: {
                href: url,
            },
            content: [{ type: "string", content: url }],
        });
    },
    href: (node) => {
        const args = getArgsContent(node);
        const url = printRaw(args[1] || "#");
        return htmlLike({
            tag: "url",
            attributes: {
                href: url,
            },
            content: args[2] || [],
        });
    },
    hyperref: (node) => {
        const args = getArgsContent(node);
        const url = "#" + printRaw(args[0] || "");
        return htmlLike({
            tag: "url",
            attributes: {
                href: url,
            },
            content: args[1] || [],
        });
    },
    "\\": createEmptyString(),
    vspace: createEmptyString(),
    hspace: createEmptyString(),
    textcolor: factory("em", true),
    textsize: createEmptyString(),
    makebox: createEmptyString(), // remove for now
    noindent: createEmptyString(),
    includegraphics: (node) => {
        const args = getArgsContent(node);
        const source = printRaw(args[args.length - 1] || []);
        return htmlLike({
            tag: "image",
            attributes: {
                source,
            },
            content: [],
        });
    },
};
