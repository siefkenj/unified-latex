import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    getArgsContent,
    getNamedArgsContent,
} from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import {
    makeWarningMessage,
    emptyStringWithWarningFactory,
    sanitizeXmlId,
} from "./utils";
import { printLatexAst } from "@unified-latex/unified-latex-prettier";

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
            const message = makeWarningMessage(
                macro,
                `Warning: There is no equivalent tag for \"${macro.content}\", \"${tag}\" was used as a replacement.`,
                "macro-subs"
            );
            file.message(message, message.place, message.source);
        }

        // Assume the meaningful argument is the last argument. This
        // ensures that we can convert for default packages as well as
        // packages like beamer, which may add optional arguments.
        const args = getArgsContent(macro);
        const content = args[args.length - 1] || [];
        return htmlLike({ tag, content, attributes });
    };
}

function xrefFactory(
    tag: string,
    attrName: string = "ref",
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
            const message = makeWarningMessage(
                macro,
                warningMessage,
                "macro-subs"
            );
            file.message(message, message.place, message.source);
        }
        // Assume the meaningful argument is the last argument.
        const args = getArgsContent(macro);
        const content = args[args.length - 1] || [];
        return htmlLike({
            tag,
            attributes: { [attrName]: sanitizeXmlId(printRaw(content)), ...attributes },
        });
    }
}

function onlyContent(
    warningMessage: string = ""
): (macro: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node {
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
            const message = makeWarningMessage(
                macro,
                warningMessage,
                "macro-subs"
            );
            file.message(message, message.place, message.source);
        }

        // Assume the meaningful argument is the last argument. This
        // ensures that we can convert for default packages as well as
        // packages like beamer, which may add optional arguments.
        const args = getArgsContent(macro);
        const content = args[args.length - 1] || [];
        return { type: "string", content: printRaw(content) };
    }
}

/**
 * Factory for beamer overlay/reveal macros (`\only`, `\uncover`, `\onslide`, ...).
 * PreTeXt slides are static, so there is no equivalent to incremental reveals:
 * we drop the overlay specification and keep the revealed content, emitting a
 * warning so the loss of the reveal behavior isn't silent.
 *
 * Unlike `onlyContent`, the content nodes are preserved (wrapped in a transparent
 * `group`) rather than flattened to a raw string, so any nested macros/markup
 * inside still get converted by the normal pipeline.
 */
function unwrapArgWithWarning(
    argIndex: number,
    warningMessage: string
): (macro: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node {
    return (macro, info, file) => {
        if (warningMessage && file) {
            const message = makeWarningMessage(
                macro,
                warningMessage,
                "macro-subs"
            );
            file.message(message, message.place, message.source);
        }
        const args = getArgsContent(macro);
        const content = args[argIndex] || [];
        return { type: "group", content };
    };
}

function createHeading(tag: string, attrs = {}) {
    return (macro: Ast.Macro) => {
        const args = getArgsContent(macro);
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
    term: factory("term"),
    underline: factory(
        "em",
        `Warning: There is no equivalent tag for \"underline\", \"em\" was used as a replacement.`
    ),
    mbox: onlyContent(
        `Warning: There is no equivalent tag for \"mbox\", the content was used as a replacement.`
    ),
    phantom: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"phantom\", an empty Ast.String was used as a replacement.`
    ),
    centering: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"centering\".  Removing the macro.`
    ),
    appendix: createHeading("appendix"),
    url: xrefFactory("url","href"),
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
    ref: xrefFactory("xref", "ref"),
    pageref: xrefFactory("xref", "ref"),
    eqref: xrefFactory("xref", "ref"),
    cref: xrefFactory("xref", "ref"),
    Cref: xrefFactory("xref", "ref"),
    cite: xrefFactory("xref", "ref"),
    index: (node) => {
        // Todo: we may want to add attributes for things like "see" and "seealso" that can be included in the index macro's arguments
        const args = getArgsContent(node);
        const term = args[0] || [];
        return htmlLike({
            tag: "idx",
            content: htmlLike({
                tag: "h",
                content: term,
            }),
        });
    },

    "\\": emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"\\\", an empty Ast.String was used as a replacement.`
    ),
    vspace: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"vspace\", an empty Ast.String was used as a replacement.`
    ),
    hspace: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"hspace\", an empty Ast.String was used as a replacement.`
    ),
    textcolor: factory(
        "em",
        `Warning: There is no equivalent tag for \"textcolor\", \"em\" was used as a replacement.`
    ),
    textsize: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"textsize\", an empty Ast.String was used as a replacement.`
    ),
    makebox: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"makebox\", an empty Ast.String was used as a replacement.`
    ),
    noindent: emptyStringWithWarningFactory(
        `Warning: There is no equivalent tag for \"noindent\", an empty Ast.String was used as a replacement.`
    ),
    latex: (node) => {
        return htmlLike({ tag: "latex" });
    },
    Latex: (node) => {
        return htmlLike({ tag: "latex" });
    },
    LaTeX: (node) => {
        return htmlLike({ tag: "latex" });
    },
    latexe: (node) => {
        return htmlLike({ tag: "latex" });
    },
    today: (node) => {
        return htmlLike({ tag: "today" });
    },
    tex: (node) => {
        return htmlLike({ tag: "tex" });
    },
    // Generator macros
    eg: () => htmlLike({ tag: "eg" }),
    ie: () => htmlLike({ tag: "ie" }),
    etc: () => htmlLike({ tag: "etc" }),
    XeTeX: () => htmlLike({ tag: "xetex" }),
    XeLaTeX: () => htmlLike({ tag: "xelatex" }),
    xelatex: () => htmlLike({ tag: "xelatex" }),
    LuaTeX: () => htmlLike({ tag: "luatex" }),
    luatex: () => htmlLike({ tag: "luatex" }),
    PreTeXt: () => htmlLike({ tag: "pretext" }),
    pretext: () => htmlLike({ tag: "pretext" }),
    Pretext: () => htmlLike({ tag: "pretext" }),
    PreFigure: () => htmlLike({ tag: "prefigure" }),
    webwork: () => htmlLike({ tag: "webwork" }),
    WeBWorK: () => htmlLike({ tag: "webwork" }),
    AD: () => htmlLike({ tag: "ad" }),
    ad: () => htmlLike({ tag: "ad" }),
    BC: () => htmlLike({ tag: "bc" }),
    bc: () => htmlLike({ tag: "bc" }),
    AM: () => htmlLike({ tag: "am" }),
    am: () => htmlLike({ tag: "am" }),
    PM: () => htmlLike({ tag: "pm" }),
    pm: () => htmlLike({ tag: "pm" }),
    nb: () => htmlLike({ tag: "nb" }),
    ps: () => htmlLike({ tag: "ps" }),
    vs: () => htmlLike({ tag: "vs" }),
    viz: () => htmlLike({ tag: "viz" }),
    etal: () => htmlLike({ tag: "etal" }),
    circa: () => htmlLike({ tag: "ca" }),
    ca: () => htmlLike({ tag: "ca" }),
    timeofday: () => htmlLike({ tag: "timeofday" }),
    // Verbatim/code macros
    code: factory("c"),
    lstinline: factory("c"),
    // Inline text macros
    fn: factory("fn"),
    footnote: factory("fn"),
    q: factory("q"),
    sq: factory("sq"),
    enquote: factory("q"),
    enquotestar: factory("sq"),
    abbr: factory("abbr"),
    ac: factory("acro"),
    acro: factory("acro"),
    init: factory("init"),
    foreign: factory("foreign"),
    foreignlanguage: factory("foreign"),
    booktitle: factory("pubtitle"),
    pubtitle: factory("pubtitle"),
    articletitle: factory("articletitle"),
    // XML helper macros
    xmltag: factory("tag"),
    xmlattr: factory("attr"),
    // Misc inline macros
    taxon: factory("taxon"),
    kbd: factory("kbd"),
    icon: factory("icon"),
    fillin: () => htmlLike({ tag: "fillin" }),
    // Tracked-change macros
    sout: factory("delete"),
    insert: factory("insert"),
    stale: factory("stale"),
    // Character/symbol macros
    // Dash and space ligature macros (injected by replaceQuoteLigatures pre-pass)
    mdash: () => htmlLike({ tag: "mdash" }),
    ndash: () => htmlLike({ tag: "ndash" }),
    nbsp: () => htmlLike({ tag: "nbsp" }),
    // Standard LaTeX section/pilcrow macros
    P: () => htmlLike({ tag: "pilcrow" }),
    S: () => htmlLike({ tag: "section-mark" }),
    copyright: () => htmlLike({ tag: "copyright" }),
    registered: () => htmlLike({ tag: "registered" }),
    trademark: () => htmlLike({ tag: "trademark" }),
    degree: () => htmlLike({ tag: "degree" }),
    textdegree: () => htmlLike({ tag: "degree" }),
    dagger: () => htmlLike({ tag: "dagger" }),
    ddagger: () => htmlLike({ tag: "dagger" }),
    ldots: () => htmlLike({ tag: "ellipsis" }),
    dots: () => htmlLike({ tag: "ellipsis" }),
    textpm: () => htmlLike({ tag: "plusminus" }),
    textregistered: () => htmlLike({ tag: "registered" }),
    texttrademark: () => htmlLike({ tag: "trademark" }),
    textsection: () => htmlLike({ tag: "section-mark" }),
    textpilcrow: () => htmlLike({ tag: "pilcrow" }),
    textperiodcentered: () => htmlLike({ tag: "midpoint" }),
    texttildelow: () => htmlLike({ tag: "swungdash" }),
    textperthousand: () => htmlLike({ tag: "permille" }),
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
    caption: (node, parent) => {
        const args = getArgsContent(node);
        const namedArgs = getNamedArgsContent(node);
        const captionText =
            namedArgs["captionText"] || args[args.length - 1] || [];
        // Tables have titles instead of captions.
        // Note we do this check after environment subs, so we already converted the table to an html-like tag with tagName "table"
        const isInTable =
            parent?.parents?.some(
                (ancestor) =>
                    ancestor.type === "macro" &&
                    ancestor.content === "html-tag:table"
            ) ?? false;
        let ret = htmlLike({
            tag: isInTable ? "title" : "caption",
            content: captionText,
        });
        return ret;
    },
    // `\frametitle`/`\framesubtitle` are normally lifted out of their `frame`
    // environment and turned into `<title>`/`<subtitle>` by `beamerFrameFactory`
    // (see environment-subs.ts). These entries are a fallback for any stray usage
    // outside a frame so the argument content is still preserved.
    frametitle: factory("title"),
    framesubtitle: factory("subtitle"),
    // Beamer overlay/reveal commands. PreTeXt slides are static, so incremental
    // reveals have no equivalent: we keep the content and drop the reveal, warning
    // each time. `\pause` has no content and is simply removed.
    pause: emptyStringWithWarningFactory(
        `Warning: There is no equivalent for beamer's "\\pause"; the overlay/reveal was dropped.`
    ),
    only: unwrapArgWithWarning(
        1,
        `Warning: There is no equivalent for beamer's "\\only"; the overlay spec was dropped and its content kept.`
    ),
    uncover: unwrapArgWithWarning(
        1,
        `Warning: There is no equivalent for beamer's "\\uncover"; the overlay spec was dropped and its content kept.`
    ),
    visible: unwrapArgWithWarning(
        1,
        `Warning: There is no equivalent for beamer's "\\visible"; the overlay spec was dropped and its content kept.`
    ),
    invisible: unwrapArgWithWarning(
        1,
        `Warning: There is no equivalent for beamer's "\\invisible"; the overlay spec was dropped and its content kept.`
    ),
    onslide: unwrapArgWithWarning(
        3,
        `Warning: There is no equivalent for beamer's "\\onslide"; the overlay spec was dropped and its content kept.`
    ),
    alt: unwrapArgWithWarning(
        1,
        `Warning: There is no equivalent for beamer's "\\alt"; only the default (first) alternative was kept.`
    ),
    temporal: unwrapArgWithWarning(
        2,
        `Warning: There is no equivalent for beamer's "\\temporal"; only the default (middle) alternative was kept.`
    ),
};
