import * as Ast from "@unified-latex/unified-latex-types";
import { s } from "@unified-latex/unified-latex-builder";
import {
    htmlLike,
    extractFromHtmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { parseLigatures } from "@unified-latex/unified-latex-util-ligatures";
import { trim } from "@unified-latex/unified-latex-util-trim";

/**
 * The order CSL fields must appear in inside a `<biblio>`.
 *
 * Unlike the `type="bibtex"` content model -- which is a `zeroOrMore`/`choice`
 * and so accepts fields in any order -- the CSL content model is a *sequence*
 * of optional elements. Emitting fields out of this order produces silently
 * schema-invalid output, so entries are built into a field map and then
 * serialized through this list rather than pushed as they're discovered.
 */
const CSL_FIELD_ORDER = [
    "author",
    "editor",
    "translator",
    "title",
    "container-title",
    "collection-title",
    "genre",
    "edition",
    "volume",
    "number",
    "issue",
    "issued",
    "accessed",
    "page",
    "page-first",
    "number-of-pages",
    "publisher",
    "publisher-place",
    "DOI",
    "ISBN",
    "ISSN",
    "URL",
] as const;

/**
 * Environment replacement runs as a complete pass *before* macro replacement
 * (see `unified-latex-plugin-to-pretext-like.ts`, which orders it that way so
 * environments like `tabular` still see their `\\` separators). So when a
 * bibliography is converted, its entries still hold raw LaTeX macros: `\emph`,
 * `\textbf`, and the `\nbsp`/`\ndash` macros that `replaceQuoteLigatures`
 * injected earlier in the pipeline. Nested content can nevertheless arrive
 * already converted, so every lookup here accepts the raw macro name *and* the
 * `html-tag:` form.
 */

/** Ligature macros/elements, mapped back to the characters the parsing expects. */
const LIGATURE_TEXT: Record<string, string> = {
    nbsp: " ",
    ndash: "--",
    mdash: "---",
    ellipsis: "...",
    ldots: "...",
    dots: "...",
};

/** Escaped characters, which reach us as single-character macros. */
const SYMBOL_MACROS: Record<string, string> = {
    "&": "&",
    "%": "%",
    _: "_",
    "#": "#",
    $: "$",
};

/**
 * Macros contributing no text of their own: `.bst` glue (`\newblock`) and bare
 * font switches, which matter only as emphasis markers (see `asEmphasis`).
 */
const STRUCTURAL_MACROS = new Set([
    "newblock",
    "bysame",
    "em",
    "it",
    "bf",
    "rm",
    "sl",
    "sc",
    "tt",
    "itshape",
    "bfseries",
    "protect",
    "noopsort",
    "urlprefix",
]);

/**
 * Link macros. Their argument is the URL itself, so it has to be unwrapped
 * rather than printed raw -- otherwise `\url{...}` reaches the field text as
 * literal `\url{` plus a URL carrying a trailing brace.
 */
const URL_MACROS = new Set(["url", "nolinkurl", "hyperbaseurl"]);

/** Macros that wrap text; their contents still count toward the field's text. */
const TEXT_WRAPPER_MACROS = new Set([
    "emph", "textit", "textbf", "textrm", "textsc", "textsf", "texttt",
    "textsl", "textnormal", "textup", "textmd", "mbox", "hbox", "text",
]);

/** `\emph{...}`-style emphasis, and the group form's leading font switch. */
const EMPHASIS_MACROS = new Set(["emph", "textit", "textsl"]);
const EMPHASIS_SWITCHES = new Set(["em", "it", "itshape", "sl"]);

/** AMS styles set the volume in bold. */
const BOLD_MACROS = new Set(["textbf"]);
const BOLD_SWITCHES = new Set(["bf", "bfseries"]);

/**
 * Flatten nodes to plain text. CSL name parts and most CSL fields are `<text/>`
 * in the schema, so they cannot carry markup and must be reduced to a string.
 * Accents (`G{\"o}del`) are still unexpanded macros at this point in the
 * pipeline -- `expandUnicodeLigatures` runs much later -- so ligatures are
 * resolved here to keep them out of the extracted text.
 */
function flattenText(nodes: Ast.Node[]): string {
    let expanded = nodes;
    try {
        expanded = parseLigatures(nodes);
    } catch {
        // A node shape the ligature grammar doesn't accept; use the text as-is.
    }
    return expanded.map(nodeText).join("");
}

/**
 * Flatten without ligature expansion, for verbatim runs such as URLs. Running
 * the ligature pass over a URL would turn its `~` into a Unicode non-breaking
 * space and its `--` into an en dash, corrupting the link (and, because `\s`
 * matches U+00A0, truncating it at the tilde when it is later matched).
 */
function flattenVerbatim(nodes: Ast.Node[]): string {
    return nodes.map(nodeText).join("");
}

function nodeText(node: Ast.Node): string {
    // `isHtmlLikeTag` is a type guard, so testing `node` directly would narrow
    // it and leave `case "macro"` below unreachable. Use an alias, as
    // `to-pretext.ts` does for the same reason.
    const htmlNode = node;
    if (isHtmlLikeTag(htmlNode)) {
        const { tag, attributes, content } = extractFromHtmlLike(htmlNode);
        if (tag in LIGATURE_TEXT) {
            return LIGATURE_TEXT[tag];
        }
        // A converted `<url href="..."/>` carries its link in the attribute.
        if (tag === "url" && typeof attributes.href === "string") {
            return attributes.href;
        }
        return flattenText(content);
    }
    switch (node.type) {
        case "string":
            return node.content;
        case "whitespace":
            return " ";
        case "group":
            return flattenText(node.content);
        case "macro": {
            const name = node.content;
            if (name in SYMBOL_MACROS) {
                return SYMBOL_MACROS[name];
            }
            if (name in LIGATURE_TEXT) {
                return LIGATURE_TEXT[name];
            }
            if (STRUCTURAL_MACROS.has(name)) {
                return "";
            }
            if (URL_MACROS.has(name) && node.args?.length) {
                return flattenVerbatim(node.args[node.args.length - 1].content);
            }
            // `\href[opts]{url}{text}`: the URL is the more useful half here.
            if (name === "href" && (node.args?.length ?? 0) >= 2) {
                return flattenVerbatim(
                    node.args![node.args!.length - 2].content
                );
            }
            if (TEXT_WRAPPER_MACROS.has(name) && node.args?.length) {
                return flattenText(node.args[node.args.length - 1].content);
            }
            return printRaw(node);
        }
        case "inlinemath":
            return printRaw(node.content);
        case "comment":
        case "parbreak":
            return " ";
        default:
            return printRaw(node);
    }
}

/**
 * If `node` is a region set in the given font, return its contents.
 *
 * Three spellings reach us: the raw macro (`\emph{...}`), the already-converted
 * element (`<em>`, if this entry sat inside something replaced earlier), and
 * the older group form (`{\em ...}`) that `.bst` styles like `plain` emit.
 */
function asFontRegion(
    node: Ast.Node,
    tag: string,
    macros: Set<string>,
    switches: Set<string>
): Ast.Node[] | null {
    // Aliased for the same type-narrowing reason as in `nodeText`.
    const htmlNode = node;
    if (isHtmlLikeTag(htmlNode)) {
        const extracted = extractFromHtmlLike(htmlNode);
        return extracted.tag === tag ? extracted.content : null;
    }
    if (match.anyMacro(node) && macros.has(node.content) && node.args?.length) {
        return node.args[node.args.length - 1].content;
    }
    if (match.group(node)) {
        const [first, ...rest] = node.content;
        if (first && match.anyMacro(first) && switches.has(first.content)) {
            return rest;
        }
    }
    return null;
}

function asEmphasis(node: Ast.Node): Ast.Node[] | null {
    return asFontRegion(node, "em", EMPHASIS_MACROS, EMPHASIS_SWITCHES);
}

function asBold(node: Ast.Node): Ast.Node[] | null {
    return asFontRegion(node, "alert", BOLD_MACROS, BOLD_SWITCHES);
}

/** Index of the first emphasized region in `nodes`, or -1. */
function findEmphasisIndex(nodes: Ast.Node[]): number {
    return nodes.findIndex((node) => asEmphasis(node) !== null);
}

/** Split a `\bibitem` body on `\newblock` separators. */
function splitOnNewblock(nodes: Ast.Node[]): Ast.Node[][] {
    const segments: Ast.Node[][] = [[]];
    for (const node of nodes) {
        if (match.macro(node, "newblock")) {
            segments.push([]);
        } else {
            segments[segments.length - 1].push(node);
        }
    }
    return segments;
}

/** Drop leading/trailing whitespace and a trailing `.`/`,` from a node list. */
function tidyFieldNodes(nodes: Ast.Node[]): Ast.Node[] {
    const result = [...nodes];
    trim(result);
    const last = result[result.length - 1];
    if (last && last.type === "string") {
        const stripped = last.content.replace(/[.,]+$/, "");
        if (stripped !== last.content) {
            if (stripped) {
                result[result.length - 1] = s(stripped);
            } else {
                result.pop();
            }
            trim(result);
        }
    }
    return result;
}

/** Collapse whitespace and strip surrounding punctuation from extracted text. */
function tidyText(text: string): string {
    return text
        .replace(/\s+/g, " ")
        .replace(/^[\s.,;:]+/, "")
        .replace(/[\s.,;:]+$/, "")
        .trim();
}

/**
 * Like `tidyText`, but keeps a trailing period, which in a name is usually part
 * of an initial (`J. B.`) rather than punctuation.
 */
function tidyNamePart(text: string): string {
    return text
        .replace(/\s+/g, " ")
        .replace(/^[\s.,;:]+/, "")
        .replace(/[\s,;:]+$/, "")
        .trim();
}

/**
 * Drop a sentence-ending period from an author region (`... D. W. Farmer.`)
 * while leaving a trailing initial's dot alone (`Conrey, J. B.`).
 */
function stripTerminalPeriod(text: string): string {
    return /(?:^|\s)[A-Z]\.$/.test(text) ? text : text.replace(/\.+$/, "");
}

export type PersonName = {
    given?: string;
    family?: string;
    nonDroppingParticle?: string;
    suffix?: string;
};

/** Name particles that belong with the family name rather than the given name. */
const NAME_PARTICLES = new Set([
    "van", "von", "de", "der", "den", "del", "della", "di", "du",
    "la", "le", "ter", "dos", "da", "af", "zu",
]);

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);

/** Whether a fragment looks like initials/given names ("J. B."), not a surname. */
function looksLikeGivenName(text: string): boolean {
    return /^(?:[A-Z]\.?\s*)+$/.test(text.trim());
}

/**
 * Split an author region into individual names.
 *
 * Handles `A and B`, `A, B, and C`, and `A & B`, plus the inverted
 * `Family, Given` form -- which is why a comma cannot simply be treated as a
 * separator: `Conrey, J. B.` is one name, `J. Smith, A. Jones` is two.
 */
function splitAuthorList(text: string): string[] {
    const names: string[] = [];
    for (const chunk of text.split(/\s+and\s+|\s*&\s*/)) {
        const trimmed = tidyNamePart(chunk);
        if (!trimmed) {
            continue;
        }
        if (!trimmed.includes(",")) {
            names.push(trimmed);
            continue;
        }
        const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
        // `Family, Given` stays one name; anything else is a list of full names.
        if (parts.length === 2 && looksLikeGivenName(parts[1])) {
            names.push(trimmed);
        } else {
            names.push(...parts);
        }
    }
    return names;
}

function parseName(text: string): PersonName {
    const commaIndex = text.indexOf(",");
    if (commaIndex !== -1) {
        const family = tidyNamePart(text.slice(0, commaIndex));
        const given = tidyNamePart(text.slice(commaIndex + 1));
        return { ...(given ? { given } : {}), ...(family ? { family } : {}) };
    }

    const tokens = tidyNamePart(text).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return {};
    }

    let suffix: string | undefined;
    if (tokens.length > 1 && NAME_SUFFIXES.has(tokens[tokens.length - 1].toLowerCase())) {
        suffix = tokens.pop();
    }

    const family = tokens.pop();
    const particleStart = tokens.findIndex((t) =>
        NAME_PARTICLES.has(t.toLowerCase())
    );
    const nonDroppingParticle =
        particleStart === -1 ? undefined : tokens.slice(particleStart).join(" ");
    const given =
        particleStart === -1
            ? tokens.join(" ")
            : tokens.slice(0, particleStart).join(" ");

    return {
        ...(given ? { given } : {}),
        ...(nonDroppingParticle ? { nonDroppingParticle } : {}),
        ...(family ? { family } : {}),
        ...(suffix ? { suffix } : {}),
    };
}

function parseAuthors(text: string): PersonName[] {
    return splitAuthorList(stripTerminalPeriod(tidyNamePart(text)))
        .map(parseName)
        .filter((name) => name.family || name.given);
}

type PublicationInfo = {
    containerTitle?: string;
    volume?: string;
    number?: string;
    year?: string;
    page?: string;
    publisher?: string;
    publisherPlace?: string;
    edition?: string;
    doi?: string;
    url?: string;
};

/**
 * Pull structured fields out of the free text that follows an entry's title.
 *
 * Each field is removed from the string as it is recognized, so that whatever
 * prose remains at the end can be attributed to the journal name (for articles)
 * or the publisher (for books).
 */
function parsePublicationInfo(
    text: string,
    boldText: string | undefined
): PublicationInfo {
    const info: PublicationInfo = {};
    let rest = text;

    const take = (re: RegExp, onMatch: (m: RegExpMatchArray) => void): void => {
        const matched = rest.match(re);
        if (matched) {
            onMatch(matched);
            rest = rest.replace(matched[0], " ");
        }
    };

    take(/\b10\.\d{4,}\/[^\s,;)}]+/, (m) => (info.doi = m[0]));
    take(/https?:\/\/[^\s,;)}]+/, (m) => (info.url = m[0]));
    // Page ranges: `883--908` arrives as `883--908` once <ndash/> is flattened.
    take(/(\d+)\s*-{1,3}\s*(\d+)/, (m) => (info.page = `${m[1]}-${m[2]}`));
    take(/\((\d{4})\)/, (m) => (info.year = m[1]));
    if (!info.year) {
        take(/\b(1[6-9]\d{2}|20\d{2})\b/, (m) => (info.year = m[1]));
    }
    take(/\b(\d+)\s*(?:st|nd|rd|th)\s*ed\b\.?/i, (m) => (info.edition = m[1]));
    take(/\bno\.\s*(\d+)/i, (m) => (info.number = m[1]));
    take(/\bvol\.\s*(\d+)/i, (m) => (info.volume = m[1]));
    // plain.bst renders volume/issue as `(17):883--908`; the pages are already gone.
    if (!info.number) {
        take(/\((\d+)\)/, (m) => (info.number = m[1]));
    }

    // AMS styles set the volume in bold.
    if (!info.volume && boldText && /^\d+$/.test(boldText.trim())) {
        info.volume = boldText.trim();
    }

    // Whatever prose survives, in document order.
    const segments = rest
        .replace(/\(\s*\)/g, " ")
        .split(",")
        .map(tidyText)
        .filter((seg) => seg.length > 0 && !/^[\d\s.:;-]+$/.test(seg));

    const isArticle = Boolean(info.page || info.volume || info.number);
    if (segments.length > 0) {
        if (isArticle) {
            info.containerTitle = segments[0];
        } else {
            info.publisher = segments[0];
            if (segments.length > 1) {
                info.publisherPlace = segments[1];
            }
        }
    }

    return info;
}

export type CslEntry = {
    type: string;
    authors: PersonName[];
    title: Ast.Node[];
} & PublicationInfo;

/** Choose a CSL entry type from the fields that were recovered. */
function classify(info: PublicationInfo): string {
    if (info.page || info.volume || info.number || info.containerTitle) {
        return "article-journal";
    }
    if (info.publisher) {
        return "book";
    }
    // A bare link with no publication details is most likely a web page.
    if (info.url) {
        return "webpage";
    }
    return "document";
}

/**
 * Parse a single `\bibitem` body into CSL fields, or return `null` when the
 * entry is too unstructured to be worth marking up (the caller then falls back
 * to `<biblio type="raw">`, which is always valid and still anchors `\cite`).
 *
 * Two `.bst` conventions are recognized, discriminated by `\newblock`:
 *
 *   * AMS-style (`amsplain`, and most hand-written entries) has no `\newblock`
 *     and italicizes the *title*:
 *     `Authors, \emph{Title}, Journal (2000), no. 17, 883--908.`
 *   * `plain`/`abbrv`/`alpha` separate fields with `\newblock` and italicize
 *     the *journal*:
 *     `Authors. \newblock Title. \newblock {\em Journal}, (17):883--908, 2000.`
 *
 * `previousAuthors` supplies the author list for AMS's `\bysame`, which stands
 * in for "same author as the preceding entry".
 */
export function parseBibitemToCsl(
    body: Ast.Node[],
    previousAuthors?: PersonName[]
): CslEntry | null {
    const nodes = [...body];
    trim(nodes);
    if (nodes.length === 0) {
        return null;
    }

    const segments = splitOnNewblock(nodes);

    let authorNodes: Ast.Node[];
    let titleNodes: Ast.Node[];
    let restNodes: Ast.Node[];

    if (segments.length > 1) {
        // `\newblock` style: authors / title / publication info.
        authorNodes = segments[0];
        titleNodes = segments[1] || [];
        restNodes = segments.slice(2).flat();
    } else {
        // AMS style: the first emphasized run is the title.
        const titleIndex = findEmphasisIndex(nodes);
        if (titleIndex === -1) {
            return null;
        }
        authorNodes = nodes.slice(0, titleIndex);
        titleNodes = asEmphasis(nodes[titleIndex]) || [];
        restNodes = nodes.slice(titleIndex + 1);
    }

    const title = tidyFieldNodes(titleNodes);
    if (title.length === 0) {
        return null;
    }

    // In `\newblock` style the emphasized run inside the publication info is
    // the journal name; pull it out so it isn't parsed as anonymous prose.
    let containerFromEmphasis: string | undefined;
    const restEmphasisIndex = findEmphasisIndex(restNodes);
    if (restEmphasisIndex !== -1) {
        containerFromEmphasis = tidyText(
            flattenText(asEmphasis(restNodes[restEmphasisIndex]) || [])
        );
        restNodes = restNodes.filter((_, i) => i !== restEmphasisIndex);
    }

    // AMS styles bold the volume number. When that's what the bold run holds,
    // drop the node so its digits aren't also read as part of the journal name.
    const boldIndex = restNodes.findIndex((node) => asBold(node) !== null);
    let boldText: string | undefined;
    if (boldIndex !== -1) {
        boldText = tidyText(flattenText(asBold(restNodes[boldIndex]) || []));
        if (/^\d+$/.test(boldText)) {
            restNodes = restNodes.filter((_, i) => i !== boldIndex);
        }
    }

    const info = parsePublicationInfo(flattenText(restNodes), boldText);
    if (containerFromEmphasis) {
        info.containerTitle = containerFromEmphasis;
    }

    // `\bysame` stands in for the preceding entry's author list.
    const repeatsAuthor = authorNodes.some((node) =>
        match.macro(node, "bysame")
    );
    const authors = repeatsAuthor
        ? previousAuthors || []
        : parseAuthors(flattenText(authorNodes));

    // Require enough recovered structure to beat a raw entry.
    const hasContext =
        authors.length > 0 ||
        Boolean(info.year || info.containerTitle || info.publisher);
    if (!hasContext) {
        return null;
    }

    return { type: classify(info), authors, title, ...info };
}

function textElement(tag: string, text: string): Ast.Macro {
    return htmlLike({ tag, content: [s(text)] });
}

/** Build a CSL `<name>`; its child elements may appear in any order. */
function nameElement(name: PersonName): Ast.Macro {
    const parts: Ast.Macro[] = [];
    if (name.given) {
        parts.push(textElement("given", name.given));
    }
    if (name.nonDroppingParticle) {
        parts.push(textElement("non-dropping-particle", name.nonDroppingParticle));
    }
    if (name.family) {
        parts.push(textElement("family", name.family));
    }
    if (name.suffix) {
        parts.push(textElement("suffix", name.suffix));
    }
    return htmlLike({ tag: "name", content: parts });
}

/**
 * Render a parsed entry as `<biblio type="..." xml:id="...">`, emitting fields
 * in the schema's canonical order (see `CSL_FIELD_ORDER`).
 */
export function renderCslBiblio(key: string, entry: CslEntry): Ast.Macro {
    const fields: Record<string, Ast.Macro> = {};

    if (entry.authors.length > 0) {
        fields["author"] = htmlLike({
            tag: "author",
            content: entry.authors.map(nameElement),
        });
    }
    fields["title"] = htmlLike({ tag: "title", content: entry.title });
    if (entry.containerTitle) {
        fields["container-title"] = textElement(
            "container-title",
            entry.containerTitle
        );
    }
    if (entry.edition) {
        fields["edition"] = textElement("edition", entry.edition);
    }
    if (entry.volume) {
        fields["volume"] = textElement("volume", entry.volume);
    }
    if (entry.number) {
        fields["number"] = textElement("number", entry.number);
    }
    if (entry.year) {
        fields["issued"] = htmlLike({
            tag: "issued",
            content: [
                htmlLike({
                    tag: "date",
                    attributes: { year: entry.year },
                    content: [],
                }),
            ],
        });
    }
    if (entry.page) {
        fields["page"] = textElement("page", entry.page);
    }
    if (entry.publisher) {
        fields["publisher"] = textElement("publisher", entry.publisher);
    }
    if (entry.publisherPlace) {
        fields["publisher-place"] = textElement(
            "publisher-place",
            entry.publisherPlace
        );
    }
    if (entry.doi) {
        fields["DOI"] = textElement("DOI", entry.doi);
    }
    if (entry.url) {
        fields["URL"] = textElement("URL", entry.url);
    }

    return htmlLike({
        tag: "biblio",
        attributes: { "xml:id": key, type: entry.type },
        content: CSL_FIELD_ORDER.filter((field) => fields[field]).map(
            (field) => fields[field]
        ),
    });
}
