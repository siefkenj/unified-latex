import { xcolorMacroToHex } from "@unified-latex/unified-latex-ctan/package/xcolor";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

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
        const content = getArgsContent(macro)[0] || [];
        return htmlLike({ tag, content, attributes });
    };
}

function createHeading(tag: string) {
    return (macro: Ast.Macro) => {
        const args = getArgsContent(macro);
        const starred = !!args[0];
        const attributes: Record<string, string> = starred
            ? { className: "starred" }
            : {};
        return htmlLike({
            tag,
            content: args[2] || [],
            attributes,
        });
    };
}

export const macroReplacements: Record<string, (node: Ast.Macro) => Ast.Node> =
    {
        emph: factory("em", { className: "emph" }),
        textrm: factory("span", { className: "textrm" }),
        textsf: factory("span", { className: "textsf" }),
        texttt: factory("span", { className: "texttt" }),
        textsl: factory("span", { className: "textsl" }),
        textit: factory("i", { className: "textit" }),
        textbf: factory("b", { className: "textbf" }),
        underline: factory("span", { className: "underline" }),
        mbox: factory("span", { className: "mbox" }),
        part: createHeading("h1"),
        chapter: createHeading("h2"),
        section: createHeading("h3"),
        subsection: createHeading("h4"),
        subsubsection: createHeading("h5"),
        appendix: createHeading("h2"),
        smallskip: () =>
            htmlLike({
                tag: "br",
                attributes: { className: "smallskip" },
            }),
        medskip: () =>
            htmlLike({
                tag: "br",
                attributes: { className: "medskip" },
            }),
        bigskip: () =>
            htmlLike({
                tag: "br",
                attributes: { className: "bigskip" },
            }),
        url: (node) => {
            const args = getArgsContent(node);
            const url = printRaw(args[0] || "#");
            return htmlLike({
                tag: "a",
                attributes: {
                    className: "url",
                    href: url,
                },
                content: [{ type: "string", content: url }],
            });
        },
        href: (node) => {
            const args = getArgsContent(node);
            const url = printRaw(args[1] || "#");
            return htmlLike({
                tag: "a",
                attributes: {
                    className: "href",
                    href: url,
                },
                content: args[2] || [],
            });
        },
        "\\": () =>
            htmlLike({
                tag: "br",
                attributes: { className: "linebreak" },
            }),
        vspace: (node) => {
            const args = getArgsContent(node);
            return htmlLike({
                tag: "vspace",
                attributes: {
                    className: "vspace",
                    amount: printRaw(args[1] || []),
                },
                content: [],
            });
        },
        textcolor: (node) => {
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
        textsize: (node) => {
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
        makebox: (node) => {
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
        noindent: (node) => ({ type: "string", content: "" }),
    };
