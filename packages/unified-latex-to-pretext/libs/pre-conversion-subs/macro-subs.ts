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
 * warningMessage is a warning for any latex macros that don't have an equivalent
 * pretext tag.
 */
function factory(
    tag: string,
    warningMessage: string = "",
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
        if (warningMessage && file) {
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

/**
 * Create a warning message if the latex node has no equivalent pretext tag.
 */
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

// put this and createMessage in a utils file
/**
 * Create an empty Ast.String node.
 */
function createEmptyString(
    warningMessage: string
): (macro: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.String {
    return (macro, info, file) => {
        // add a warning message
        if (file) {
            const message = createMessage(macro, warningMessage);
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
    textrm: factory(
        "em",
        `Warning: There is no equivalent tag for \"textrm\", \"em\" was used as a replacement.`
    ),
    textsf: factory(
        "em",
        `Warning: There is no equivalent tag for \"textsf\", \"em\" was used as a replacement.`
    ),
    texttt: factory(
        "em",
        `Warning: There is no equivalent tag for \"textsf\", \"em\" was used as a replacement.`
    ),
    textsl: factory(
        "em",
        `Warning: There is no equivalent tag for \"textsl\", \"em\" was used as a replacement.`
    ),
    textit: factory("em"),
    textbf: factory("alert"),
    underline: factory(
        "em",
        `Warning: There is no equivalent tag for \"underline\", \"em\" was used as a replacement.`
    ),
    mbox: createEmptyString(
        `Warning: There is no equivalent tag for \"mbox\", an empty Ast.String was used as a replacement.`
    ),
    phantom: createEmptyString(
        `Warning: There is no equivalent tag for \"phantom\", an empty Ast.String was used as a replacement.`
    ),
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
    "\\": createEmptyString(
        `Warning: There is no equivalent tag for \"\\\", an empty Ast.String was used as a replacement.`
    ),
    vspace: createEmptyString(
        `Warning: There is no equivalent tag for \"vspace\", an empty Ast.String was used as a replacement.`
    ),
    hspace: createEmptyString(
        `Warning: There is no equivalent tag for \"hspace\", an empty Ast.String was used as a replacement.`
    ),
    textcolor: factory(
        "em",
        `Warning: There is no equivalent tag for \"textcolor\", \"em\" was used as a replacement.`
    ),
    textsize: createEmptyString(
        `Warning: There is no equivalent tag for \"textsize\", an empty Ast.String was used as a replacement.`
    ),
    makebox: createEmptyString(
        `Warning: There is no equivalent tag for \"makebox\", an empty Ast.String was used as a replacement.`
    ), // remove for now
    noindent: createEmptyString(
        `Warning: There is no equivalent tag for \"noindent\", an empty Ast.String was used as a replacement.`
    ),
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
