import { xcolorMacroToHex } from "@unified-latex/unified-latex-ctan/package/xcolor";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "unified-lint-rule/lib";

/**
 * Factory function that generates html-like macros that wrap their contents.
 */
function factory(
    tag: string,
    attributes?: Record<string, string>
): (macro: Ast.Macro) => Ast.Macro {
    return (macro) => {
        if (!macro.args) {
            throw new Error(
                `Found macro to replace but couldn't find content ${printRaw(
                    macro
                )}`
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

export const macroReplacements: Record<
    string,
    (node: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node
> = {
    emph: factory("em"),
    textrm: factory("em"), // give warning
    textsf: factory("em"), // give warning
    texttt: factory("span"), // cd + cline tags are an option?
    textsl: factory("span"), // maybe em
    textit: factory("em"),
    textbf: factory("alert"),
    underline: factory("span"), // maybe em and warn
    // mbox: factory("span"), // can use \text{} but not an html like tag, so can't just use htmlLike
    phantom: factory("span"), // remove it, make a function that returna an empty text node (string)
    appendix: createHeading("appendix"), // title -> appendix
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
    "\\": () => // same as phantom and warn
        // no whitespace in pretext
        htmlLike({
            tag: "br",
            attributes: { className: "linebreak" },
        }),
    vspace: (node) => {// remove
        // no equivalent?
        const args = getArgsContent(node);
        return htmlLike({
            tag: "div",
            attributes: {
                className: "vspace",
                "data-amount": printRaw(args[1] || []),
            },
            content: [],
        });
    },
    hspace: (node) => { // remove
        // no equivalent?
        const args = getArgsContent(node);
        return htmlLike({
            tag: "span",
            attributes: {
                className: "vspace",
                "data-amount": printRaw(args[1] || []),
            },
            content: [],
        });
    },
    textcolor: (node) => { // em
        // no colors in pretext
        const args = getArgsContent(node);
        const computedColor = xcolorMacroToHex(node);
        const color = computedColor.hex;

        if (color) {
            return htmlLike({
                tag: "span",
                attributes: { style: `color: ${color};` },
                content: args[2] || [],
            });
        } else {
            // If we couldn't compute the color, it's probably a named
            // color that wasn't supplied. In this case, we fall back to a css variable
            return htmlLike({
                tag: "span",
                attributes: {
                    style: `color: var(${computedColor.cssVarName});`,
                },
                content: args[2] || [],
            });
        }
    },
    textsize: (node) => { // remove
        // no equivalent?
        const args = getArgsContent(node);
        const textSize = printRaw(args[0] || []);
        return htmlLike({
            tag: "span",
            attributes: {
                className: `textsize-${textSize}`,
            },
            content: args[1] || [],
        });
    },
    makebox: (node) => { // remove for now
        // maybe just do the same as mbox, text
        const args = getArgsContent(node);
        return htmlLike({
            tag: "span",
            attributes: {
                className: `latex-box`,
                style: "display: inline-block;",
            },
            content: args[3] || [],
        });
    },
    noindent: () => ({ type: "string", content: "" }), // remove
    includegraphics: (node) => {
        const args = getArgsContent(node);
        const source = printRaw(args[args.length - 1] || []);
        return htmlLike({
            tag: "image", // img -> image
            attributes: {
                source, // src -> source
            },
            content: [],
        });
    },
};
