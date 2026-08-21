import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { MacroInfoRecord } from "@unified-latex/unified-latex-types";
import { s } from "@unified-latex/unified-latex-builder";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import {
    makeWarningMessage,
    parseKeyValueAttributes,
    sanitizeXmlId,
} from "./utils";

const XINCLUDE_NAMESPACE = "http://www.w3.org/2001/XInclude";

/**
 * Macro signatures for PreTeXt Plus modular-include macros.
 * `\plus[key=value,...]{type}{ref}` mirrors `<plus:type ref="..." key="value"/>`.
 */
export const plusMacros: MacroInfoRecord = {
    plus: { signature: "o m m", renderInfo: { breakAround: true } },
};

/**
 * Options controlling how `\plus{type}{ref}` and `\include{ref}` are
 * converted to PreTeXt.
 */
export type PlusIncludeOptions = {
    /**
     * The output format for includes. `"plus"` (default) produces
     * `<plus:type ref="..."/>` elements; `"xinclude"` produces
     * `<xi:include href="..."/>` elements.
     */
    format?: "plus" | "xinclude";
    /**
     * Map a ref to an href for `xinclude` output. Defaults to `` `${ref}.ptx` ``.
     */
    resolveHref?: (ref: string, type: string) => string;
    /**
     * Map a ref to its division/asset type. Used for `\include{ref}`, which
     * doesn't carry a type. When not provided (or when it returns undefined),
     * `\include{ref}` produces the generic `<plus:include ref="..."/>`.
     */
    resolveType?: (ref: string) => string | undefined;
    /**
     * Additional types (beyond `defaultPlusTypes`) that should not trigger an
     * unknown-type warning.
     */
    extraTypes?: string[];
};

/**
 * Types recognized in `\plus{type}{ref}` without warning. The type is used
 * verbatim as the tag name after `plus:`, so these are PreTeXt element names.
 */
export const defaultPlusTypes = [
    // divisions
    "frontmatter",
    "part",
    "chapter",
    "section",
    "subsection",
    "subsubsection",
    "preface",
    "biography",
    "dedication",
    "glossary",
    "appendix",
    "index",
    "bibliography",
    "references",
    "exercises",
    "solutions",
    "worksheet",
    "handout",
    "reading-questions",
    "paragraphs",
    "introduction",
    "conclusion",
    "backmatter",
    // assets and other includable leaf content
    "image",
    "video",
    "audio",
    "interactive",
    "program",
    "listing",
    "doenet",
    "webwork",
    "sageplot",
    "asymptote",
    "latex-image",
];

/**
 * Create `macroReplacements`-style functions for `\plus[attrs]{type}{ref}`
 * and its type-free sugar `\include{ref}`.
 */
export function createPlusMacroReplacements(
    options: PlusIncludeOptions = {}
): Record<
    string,
    (node: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node
> {
    const {
        format = "plus",
        resolveHref = (ref: string) => `${ref}.ptx`,
        resolveType,
        extraTypes = [],
    } = options;
    const knownTypes = new Set([...defaultPlusTypes, ...extraTypes]);

    function warn(node: Ast.Macro, file: VFile | undefined, message: string) {
        if (!file) {
            return;
        }
        const warning = makeWarningMessage(node, message, "plus-subs");
        file.message(warning, warning.place, warning.source);
    }

    function makeInclude(
        node: Ast.Macro,
        file: VFile | undefined,
        type: string,
        ref: string,
        attributes: Record<string, string>
    ): Ast.Macro {
        if (format === "xinclude") {
            const droppedAttributes = Object.keys(attributes);
            if (droppedAttributes.length > 0) {
                warn(
                    node,
                    file,
                    `Warning: attributes "${droppedAttributes.join(
                        ", "
                    )}" cannot be represented on an <xi:include> element and were dropped.`
                );
            }
            return htmlLike({
                tag: "xi:include",
                attributes: {
                    "xmlns:xi": XINCLUDE_NAMESPACE,
                    href: resolveHref(ref, type),
                },
            });
        }
        return htmlLike({
            tag: `plus:${type}`,
            attributes: { ref, ...attributes },
        });
    }

    return {
        plus: (node, info, file) => {
            const args = getArgsContent(node);
            const type = printRaw(args[1] || []).trim();
            const ref = sanitizeXmlId(printRaw(args[2] || []).trim());
            if (!type) {
                warn(
                    node,
                    file,
                    `Warning: \\plus is missing its type argument; expected \\plus[attrs]{type}{ref}. The macro was removed.`
                );
                return s("");
            }
            if (!knownTypes.has(type)) {
                warn(
                    node,
                    file,
                    `Warning: "${type}" is not a recognized type in \\plus{${type}}{${ref}}. It was used anyway; pass it in "extraTypes" to suppress this warning.`
                );
            }
            return makeInclude(node, file, type, ref, parseKeyValueAttributes(args[0]));
        },
        include: (node, info, file) => {
            const args = getArgsContent(node);
            const ref = sanitizeXmlId(
                printRaw(args[args.length - 1] || []).trim()
            );
            const type = resolveType?.(ref) || "include";
            return makeInclude(node, file, type, ref, {});
        },
    };
}
