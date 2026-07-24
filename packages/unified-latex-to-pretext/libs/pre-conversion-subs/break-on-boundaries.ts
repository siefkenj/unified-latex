import { env, arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    anyEnvironment,
    anyMacro,
    match,
} from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import {
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { VFileMessage } from "vfile-message";
import { makeWarningMessage } from "./utils";

/**
 * All the divisions, grouped by level. Each group contains macros that break
 * content at the same depth. Multiple macros in the same group are peers
 * (e.g. \section and \exercises both create section-level divisions).
 *
 * Optional `pretextTag` overrides the PreTeXt element name when it differs
 * from the LaTeX macro name (e.g. `readingquestions` → `reading-questions`).
 */
export type DivisionEntry = {
    division: string;
    mappedEnviron: string;
    pretextTag?: string;
};

/**
 * The document-root macros. Like divisions, but for the outermost PreTeXt
 * container itself: `\book{Title}`, `\article{Title}`, or `\slideshow{Title}`
 * are expected to appear as the very first thing in the document, standing
 * in for the usual `\documentclass`/`\title` combo. Treating them as the
 * outermost division group means everything that follows (parts, chapters,
 * sections, ...) naturally ends up nested inside the resulting `_book`,
 * `_article`, or `_slideshow` environment.
 */
const documentRootGroup: DivisionEntry[] = [
    { division: "book", mappedEnviron: "_book" },
    { division: "article", mappedEnviron: "_article" },
    { division: "slideshow", mappedEnviron: "_slideshow" },
];

export const divisionGroups: DivisionEntry[][] = [
    documentRootGroup,
    // Group 0: book-part level
    [{ division: "part", mappedEnviron: "_part" }],
    // Group 1: chapter level
    [
        { division: "chapter", mappedEnviron: "_chapter" },
        { division: "preface", mappedEnviron: "_preface" },
        { division: "biography", mappedEnviron: "_biography" },
        { division: "dedication", mappedEnviron: "_dedication" },
        { division: "glossary", mappedEnviron: "_glossary" },
        { division: "appendix", mappedEnviron: "_appendix" },
        { division: "bibliography", mappedEnviron: "_bibliography" },
        { division: "references", mappedEnviron: "_references" },
    ],
    // Group 2: section level
    [
        { division: "section", mappedEnviron: "_section" },
        { division: "exercises", mappedEnviron: "_exercises" },
        { division: "solutions", mappedEnviron: "_solutions" },
        { division: "worksheet", mappedEnviron: "_worksheet" },
        { division: "handout", mappedEnviron: "_handout" },
        {
            division: "readingquestions",
            mappedEnviron: "_readingquestions",
            pretextTag: "reading-questions",
        },
    ],
    // Group 3: subsection level
    [{ division: "subsection", mappedEnviron: "_subsection" }],
    // Group 4: subsubsection level
    [{ division: "subsubsection", mappedEnviron: "_subsubsection" }],
    // Group 5: paragraph level
    [{ division: "paragraphs", mappedEnviron: "_paragraphs" }],
    // Group 6: subparagraph level
    [{ division: "subparagraph", mappedEnviron: "_subparagraph" }],
];

/**
 * Environments from the exam documentclass that use macros (`\part`, `\subpart`, etc.)
 * that conflict with division macros. These environments must be skipped by
 * `breakOnBoundaries` so their item macros are preserved.
 */
const EXAM_LIST_ENVIRONMENTS = ["parts", "subparts", "subsubparts"];

export const isExamListEnviron = match.createEnvironmentMatcher(
    EXAM_LIST_ENVIRONMENTS
);


/**
 * Flat view of all division entries — useful for lookups.
 */
export const divisions: DivisionEntry[] = divisionGroups.reduce<
    DivisionEntry[]
>((acc, group) => acc.concat(group), []);

/**
 * The standard LaTeX sectioning macros. Unlike the specialized division
 * macros (`worksheet`, `exercises`, etc.), these may take an optional
 * argument that names a division type to become instead of their usual
 * tag — e.g. `\subsection[worksheet]{Title}` produces a `<worksheet>` that
 * is nested exactly where the `\subsection` appears, rather than a
 * `<subsection>`. With no recognized type name, the optional argument is
 * ignored (as it always has been).
 */
const STANDARD_SECTIONING_MACROS = new Set([
    "chapter",
    "section",
    "subsection",
    "subsubsection",
]);

/**
 * Looks up a division entry by its macro name or its PreTeXt tag name
 * (case-insensitively), for resolving the type-override optional argument
 * on standard sectioning macros.
 */
const divisionByTypeName = new Map<string, DivisionEntry>();
for (const entry of divisions) {
    divisionByTypeName.set(entry.division.toLowerCase(), entry);
    if (entry.pretextTag) {
        divisionByTypeName.set(entry.pretextTag.toLowerCase(), entry);
    }
}

// check if a macro is a division macro
const isDivisionMacro = match.createMacroMatcher(
    divisions.map((x) => x.division)
);

// check if an environment is a newly created environment
export const isMappedEnviron = match.createEnvironmentMatcher(
    divisions.map((x) => x.mappedEnviron)
);

/**
 * Beamer `frame` environments become PreTeXt `<slide>`. A frame is really a
 * division, so — like divisions — its content should be wrapped in paragraphs by
 * the early `unifiedLatexWrapPars` pre-pass (while nested environments are still
 * environments), rather than late by an envFactory. This keeps block-level
 * children (`<assemblage>`, `<sidebyside>`, ...) out of `<p>` while still letting
 * lists sit inside a `<p>` as usual.
 */
export const isSlideEnviron = match.createEnvironmentMatcher(["frame"]);

/**
 * Check if an environment is the mapped environment for a document-root
 * macro (`_book`, `_article`, or `_slideshow`). Used to detect when the
 * document already declares its own root tag, so the `\documentclass`-based
 * heuristic can be skipped.
 */
export const isTopLevelDocEnviron = match.createEnvironmentMatcher(
    documentRootGroup.map((x) => x.mappedEnviron)
);

/**
 * Breaks up division macros into environments. Returns an object of warning messages
 * for any groups that were removed.
 */
export function breakOnBoundaries(ast: Ast.Ast): { messages: VFileMessage[] } {
    // messages for any groups removed
    const messagesLst: { messages: VFileMessage[] } = { messages: [] };

    replaceNode(ast, (node) => {
        if (match.group(node)) {
            // remove if it contains a division as an immediate child
            if (
                node.content.some((child) => {
                    return anyMacro(child) && isDivisionMacro(child);
                })
            ) {
                // add a warning message
                messagesLst.messages.push(
                    makeWarningMessage(
                        node,
                        "Warning: hoisted out of a group, which might break the LaTeX code.",
                        "break-on-boundaries"
                    )
                );

                return node.content;
            }
        }
    });

    visit(ast, (node, info) => {
        // needs to be an environment, root, or group node
        if (
            !(
                anyEnvironment(node) ||
                node.type === "root" ||
                match.group(node)
            ) ||
            // skip math mode
            info.context.hasMathModeAncestor
        ) {
            return;
        }
        // if it's an environment, make sure it isn't a newly created one
        else if (anyEnvironment(node) && isMappedEnviron(node)) {
            return;
        }
        // skip exam list environments — their \part/\subpart macros are not division macros
        else if (anyEnvironment(node) && isExamListEnviron(node)) {
            return;
        }

        // now break up the divisions, starting at part
        node.content = breakUp(node.content, 0);
    });

    replaceNode(ast, (node, info) => {
        // remove all old division nodes, but preserve exam-class macros (like \part)
        // that live inside exam list environments (parts, subparts, subsubparts)
        if (anyMacro(node) && isDivisionMacro(node)) {
            if (
                info.parents.some(
                    (p) => anyEnvironment(p) && isExamListEnviron(p)
                )
            ) {
                return;
            }
            return null;
        }
    });

    return messagesLst;
}

/**
 * Recursively breaks up the AST at the division macros.
 * Each depth corresponds to a group of peer divisions in `divisionGroups`.
 */
function breakUp(content: Ast.Node[], depth: number): Ast.Node[] {
    if (depth >= divisionGroups.length) {
        return content;
    }

    const group = divisionGroups[depth];
    const macroNames = group.map((d) => d.division);
    const splits = splitOnMacro(content, macroNames);

    // go through each segment to recursively break
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakUp(splits.segments[i], depth + 1);
    }

    createEnvironments(splits, group);

    // rebuild this part of the AST
    return unsplitOnMacro(splits);
}

/**
 * Create the new environments that replace the division macros.
 * Each macro in `splits.macros` is looked up in `group` to find its mapped
 * environment name, allowing multiple macro types at the same depth level.
 */
function createEnvironments(
    splits: { segments: Ast.Node[][]; macros: Ast.Macro[] },
    group: DivisionEntry[]
): void {
    const macroToEnv = new Map(group.map((d) => [d.division, d.mappedEnviron]));

    // loop through segments (skipping first segment)
    for (let i = 1; i < splits.segments.length; i++) {
        const macro = splits.macros[i - 1];
        let mappedEnv = macroToEnv.get(macro.content) ?? "_unknown";

        const namedArgs = getNamedArgsContent(macro);

        // standard sectioning macros may use their optional argument to
        // request a different division type, e.g. \subsection[worksheet]{Title}
        if (STANDARD_SECTIONING_MACROS.has(macro.content) && namedArgs["tocTitle"]) {
            const typeName = printRaw(namedArgs["tocTitle"]).trim().toLowerCase();
            const overrideEntry = divisionByTypeName.get(typeName);
            if (overrideEntry) {
                mappedEnv = overrideEntry.mappedEnviron;
            }
        }

        // get the title
        const title = namedArgs["title"];
        const titleArg: Ast.Argument[] = [];

        // create title argument
        if (title) {
            titleArg.push(arg(title, { braces: "[]" }));
        }

        // wrap segment with a new environment
        splits.segments[i] = [env(mappedEnv, splits.segments[i], titleArg)];
    }
}
