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
    splitOnCondition,
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
        {
            division: "readingquestions",
            mappedEnviron: "_readingquestions",
            pretextTag: "reading-questions",
        },
        { division: "specialsection", mappedEnviron: "_section" },
    ],
    // Group 3: subsection level
    [{ division: "subsection", mappedEnviron: "_subsection" }],
    // Group 4: subsubsection level
    [{ division: "subsubsection", mappedEnviron: "_subsubsection" }],
    // Group 5: printout level.
    //
    // A `\worksheet`/`\handout` is a *terminal* division: PreTeXt gives it
    // `(Page+ | PrintoutBlock+)`, where `PrintoutBlock = BlockDivision |
    // Paragraphs`, so it holds blocks but never a `<subsection>`. Sitting below
    // every numbered level in this ladder is what makes that fall out for free:
    // a printout attaches one level under whichever division encloses it, and
    // any division that follows it -- being at a shallower level -- has already
    // split the content before the printout is ever created, so it lands beside
    // the printout rather than inside it.
    //
    //     \section{S} Sec. \worksheet{W} Sheet. \subsection{Sub} Sub body.
    //
    // gives a `<section>` holding `<worksheet>` and `<subsection>` as peers.
    // `\paragraphs` is the one division a printout may contain, and it is the
    // one group below this one. An author who wants a printout at a *specific*
    // level rather than the innermost one says so with its optional argument --
    // `\worksheet[section]{...}` -- see `divisionDepth`.
    [
        { division: "worksheet", mappedEnviron: "_worksheet" },
        { division: "handout", mappedEnviron: "_handout" },
    ],
    // Group 6: paragraph level
    [{ division: "paragraphs", mappedEnviron: "_paragraphs" }],
    // Group 7: subparagraph level
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
 * Divisions that cannot contain another division.
 *
 * The printout group's position in the ladder already gives a `\worksheet` this
 * property wherever it lands by default. This backstops the cases where a
 * printout is pinned to a level with a division above it still to come:
 * `\worksheet[section]{...}` followed by a `\subsection`, or the equivalent
 * `\subsection[worksheet]{...}` followed by a `\subsubsection`. There, the
 * deeper division really would nest inside, so it has to be cut back out.
 */
const TERMINAL_DIVISION_ENVIRONS = new Set(["_worksheet", "_handout"]);

/**
 * The one kind of division a printout may contain: `\paragraphs`, and
 * `\subparagraph`, which also becomes a `<paragraphs>` (see `to-pretext.ts`).
 */
const PARAGRAPH_LEVEL_ENVIRONS = new Set(["_paragraphs", "_subparagraph"]);

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
 *
 * `\subsection[worksheet]{Title}` and `\worksheet[subsection]{Title}` are two
 * spellings of the same thing: a printout pinned to subsection level. The first
 * names the level with the macro and the type with the argument; the second
 * does it the other way around (see `PRINTOUT_LEVEL_NAMES`).
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

/**
 * The mapped environment each division macro produces, across every group.
 * `createEnvironments` looks a macro up here rather than in the group it was
 * split at, since a macro may be split one level up from its own -- see
 * `divisionDepth`.
 */
const mappedEnvironByDivision = new Map<string, string>(
    divisions.map((entry) => [entry.division, entry.mappedEnviron])
);

/**
 * Which group each division macro belongs to, by index into `divisionGroups`.
 */
const depthByDivision = new Map<string, number>();
divisionGroups.forEach((group, depth) => {
    for (const entry of group) {
        depthByDivision.set(entry.division, depth);
    }
});

/**
 * The printout macros, whose optional argument names a level rather than a
 * division type (the mirror of what it means on a standard sectioning macro).
 */
const PRINTOUT_DIVISIONS = new Set(["worksheet", "handout"]);

/**
 * Levels a printout may be pinned to with `\worksheet[<level>]{Title}`.
 *
 * A `\worksheet` normally attaches one level below whatever division encloses
 * it, which is the right answer when the author is writing a worksheet *within*
 * a section. When they mean it to stand at a particular level instead -- a
 * section-level worksheet that is a peer of the sections around it rather than
 * a part of one -- they name that level here. As with the division-type
 * override on a standard sectioning macro, an optional argument that names no
 * level is left to mean what it always did (a TOC short title, ignored).
 */
const PRINTOUT_LEVEL_NAMES = [
    "part",
    "chapter",
    "section",
    "subsection",
    "subsubsection",
];

const printoutLevelDepths = new Map<string, number>(
    PRINTOUT_LEVEL_NAMES.flatMap((name) => {
        const depth = depthByDivision.get(name);
        return depth === undefined ? [] : [[name, depth] as [string, number]];
    })
);

/**
 * The value of a macro's optional argument, lowercased, or `""` if it has none.
 */
function optionalArgName(macro: Ast.Macro): string {
    const tocTitle = getNamedArgsContent(macro)["tocTitle"];
    return tocTitle ? printRaw(tocTitle).trim().toLowerCase() : "";
}

/**
 * The group depth a division macro should be split at, or `undefined` if it
 * isn't a division macro at all.
 *
 * This is the macro's own group, except for a printout pinned to a level with
 * `\worksheet[section]{...}`.
 */
function divisionDepth(macro: Ast.Macro): number | undefined {
    const ownDepth = depthByDivision.get(macro.content);
    if (ownDepth === undefined) {
        return undefined;
    }
    if (!PRINTOUT_DIVISIONS.has(macro.content)) {
        return ownDepth;
    }
    return printoutLevelDepths.get(optionalArgName(macro)) ?? ownDepth;
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
 * Beamer `frame` environments (and their `slide` synonym) become PreTeXt
 * `<slide>`. A frame is really a division, so — like divisions — its content
 * should be wrapped in paragraphs by the early `unifiedLatexWrapPars`
 * pre-pass (while nested environments are still environments), rather than
 * late by an envFactory. This keeps block-level children (`<assemblage>`,
 * `<sidebyside>`, ...) out of `<p>` while still letting lists sit inside a
 * `<p>` as usual.
 */
export const isSlideEnviron = match.createEnvironmentMatcher(["frame", "slide"]);

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

    const { segments, separators } = splitOnCondition(content, (node) =>
        breaksAtDepth(node, depth)
    );
    const splits = { segments, macros: separators as Ast.Macro[] };

    // go through each segment to recursively break
    for (let i = 0; i < splits.segments.length; i++) {
        splits.segments[i] = breakUp(splits.segments[i], depth + 1);
    }

    createEnvironments(splits);

    // rebuild this part of the AST
    return unsplitOnMacro(splits);
}

/**
 * Should this node end the division being accumulated at `depth`?
 *
 * Normally that means "its group *is* this depth". The `<=` is a safety net for
 * a macro whose level can't be honored where it was written -- `\worksheet[chapter]`
 * inside a `\section`, say, whose chapter group was passed long before the
 * section's body was recursed into. Splitting it at the shallowest depth still
 * available puts it as close to the level asked for as the context allows;
 * without this it would match no group at all and be dropped outright by the
 * cleanup pass in `breakOnBoundaries`. Division macros written where their level
 * *is* reachable are always consumed at their own depth first, so they never
 * reach a deeper call to be caught by this.
 */
function breaksAtDepth(node: Ast.Node, depth: number): boolean {
    if (!anyMacro(node)) {
        return false;
    }
    const macroDepth = divisionDepth(node);
    return macroDepth !== undefined && macroDepth <= depth;
}

/**
 * Create the new environments that replace the division macros.
 */
function createEnvironments(splits: {
    segments: Ast.Node[][];
    macros: Ast.Macro[];
}): void {
    // loop through segments (skipping first segment)
    for (let i = 1; i < splits.segments.length; i++) {
        const macro = splits.macros[i - 1];
        let mappedEnv = mappedEnvironByDivision.get(macro.content) ?? "_unknown";

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
        splits.segments[i] = closeDivision(
            mappedEnv,
            splits.segments[i],
            titleArg
        );
    }
}

/**
 * The nodes standing in for one division: normally just the division
 * environment wrapping everything that followed its macro.
 *
 * A division that can't contain another one (see `TERMINAL_DIVISION_ENVIRONS`)
 * instead ends where the next division begins, and everything from there on is
 * hoisted back out to sit beside it. `breakUp` has already recursed into the
 * segment by this point, so a division nested in it is an environment rather
 * than a macro.
 */
function closeDivision(
    mappedEnv: string,
    segment: Ast.Node[],
    titleArg: Ast.Argument[]
): Ast.Node[] {
    if (!TERMINAL_DIVISION_ENVIRONS.has(mappedEnv)) {
        return [env(mappedEnv, segment, titleArg)];
    }

    const endIndex = segment.findIndex(
        (node) =>
            anyEnvironment(node) &&
            isMappedEnviron(node) &&
            !PARAGRAPH_LEVEL_ENVIRONS.has(node.env)
    );
    if (endIndex === -1) {
        return [env(mappedEnv, segment, titleArg)];
    }

    return [
        env(mappedEnv, segment.slice(0, endIndex), titleArg),
        ...segment.slice(endIndex),
    ];
}
