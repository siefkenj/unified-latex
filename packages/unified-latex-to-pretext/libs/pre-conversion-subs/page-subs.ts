import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import {
    extractFromHtmlLike,
    htmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { visit } from "@unified-latex/unified-latex-util-visit";
import {
    isPageBreakMarker,
    pageBreakMarker,
} from "../page-break-marker";
import { hasMeaningfulContent } from "./utils";

/**
 * PreTeXt's `<worksheet>` and `<handout>` are the only two elements that may be
 * divided into `<page>`s, and the schema makes it all-or-nothing:
 *
 *     (Objectives? & IntroductionDivision?),
 *     (Page+ | PrintoutBlock+),
 *     (Outcomes? & ConclusionDivision?)
 *
 * So either every block of the body sits inside a `<page>`, or none do -- and
 * an `<introduction>`/`<objectives>` (or `<conclusion>`/`<outcomes>`) stays
 * outside the pages either way.
 *
 * A LaTeX author spells those page divisions with `\newpage` and friends. That
 * is a typesetting command, not a structural one, so it can turn up anywhere:
 * between two paragraphs of a `\worksheet{...}`, trailing a `\question` body
 * inside a `questions` environment, or buried inside a `\part` of that
 * question. This module turns all of those into `<page>` boundaries in two
 * steps:
 *
 *   1. `hoistPageBreaks` runs on the raw LaTeX AST and replaces every page
 *      break inside a worksheet-like container with a `page-break-marker`
 *      (see page-break-marker.ts) at the container's own top level. A break
 *      nested inside a block that PreTeXt can't split -- an exercise, a task --
 *      is hoisted to the boundary *after* the block containing it, since the
 *      block itself has to land on one page or the other.
 *   2. `splitWorksheetPages` runs once the `<worksheet>`/`<handout>` content is
 *      built and groups it into `<page>` elements at those markers.
 *
 * Splitting in a second pass rather than at hoist time is what lets a single
 * implementation serve all three ways a worksheet gets built: the `\worksheet`/
 * `\handout` division macros (still `_worksheet`/`_handout` environments by
 * then), the `\begin{worksheet}` environment form, and the exam class's
 * `questions` environment (see exam-subs.ts).
 */

/**
 * Page breaks that are unconditional in LaTeX: they always start a new page.
 */
const UNCONDITIONAL_PAGE_BREAK_MACROS = new Set([
    "newpage",
    "clearpage",
    "cleardoublepage",
]);

/**
 * Is this node a page break the author meant as a real division?
 *
 * `\pagebreak` is not on the list above because it adjusts a penalty rather
 * than forcing a break: `\pagebreak[0]` through `\pagebreak[3]` are increasingly
 * strong *suggestions*, which say nothing about where the author wants a page to
 * end. Only the bare form and `\pagebreak[4]` are commands to break here.
 * (`\nopagebreak` is the opposite instruction and is never a break.)
 */
function isPageBreakMacro(node: Ast.Node): boolean {
    if (!match.anyMacro(node)) {
        return false;
    }
    if (UNCONDITIONAL_PAGE_BREAK_MACROS.has(node.content)) {
        return true;
    }
    if (node.content !== "pagebreak") {
        return false;
    }
    const level = getArgsContent(node)[0];
    return !level || level.length === 0 || printRaw(level).trim() === "4";
}

/**
 * Environments whose content can end up as the body of a `<worksheet>` or
 * `<handout>`, and so may be divided into `<page>`s.
 *
 * `_worksheet`/`_handout` are what `breakOnBoundaries` makes of the
 * `\worksheet`/`\handout` division macros; `worksheet`/`handout` are their
 * `\begin{...}` forms. `questions` is the exam-class list environment, which
 * `questionsToExercises` turns into a `<worksheet>` (or, nested inside one of
 * the above, contributes its exercises to it directly).
 */
const PAGE_CONTAINER_ENVIRONMENTS = [
    "_worksheet",
    "_handout",
    "worksheet",
    "handout",
    "questions",
];

const isPageContainerEnvironment = match.createEnvironmentMatcher(
    PAGE_CONTAINER_ENVIRONMENTS
);

/**
 * The worksheet/handout containers themselves, i.e. every page container except
 * the exam class's `questions` list.
 */
const PRINTOUT_ENVIRONMENTS = ["_worksheet", "_handout", "worksheet", "handout"];

const isPrintoutEnvironment =
    match.createEnvironmentMatcher(PRINTOUT_ENVIRONMENTS);

/**
 * The `\worksheet`/`\handout` division forms only. Unlike the `\begin{...}`
 * forms, these are never replaced by an html-like tag -- `to-pretext.ts`
 * converts them to `<worksheet>`/`<handout>` directly -- so
 * `splitWorksheetPages` has to find them as environments.
 */
const isPrintoutDivisionEnvironment = match.createEnvironmentMatcher([
    "_worksheet",
    "_handout",
]);

/**
 * The worksheet or handout a node lives in, if any.
 *
 * A `questions` environment inside one must not wrap its exercises in a
 * `<worksheet>` of its own, since that would nest one printout inside another --
 * see `questionsToExercises`.
 */
export function enclosingPrintoutDivision(
    parents: readonly (Ast.Node | Ast.Argument)[]
): Ast.Environment | undefined {
    return parents.find((parent) => isPrintoutEnvironment(parent)) as
        | Ast.Environment
        | undefined;
}

/**
 * Replace every page break inside a worksheet-like container with a
 * `page-break-marker` at that container's top level.
 *
 * Must run on the raw LaTeX AST: the breaks have to be gone before
 * `attachVerticalSpaceWorkspace` looks for a `\vspace`/`\vfill` trailing a
 * block (`\question ...\vfill\newpage` reserves workspace on the exercise just
 * as `\question ...\vfill` does), and before `dropped-subs.ts` would otherwise
 * discard them as having no PreTeXt equivalent.
 *
 * Breaks outside any worksheet or handout are left alone -- PreTeXt has nowhere
 * to put a page division in a `<section>` -- and `dropped-subs.ts` goes on
 * warning about them.
 */
export function hoistPageBreaks(tree: Ast.Root): void {
    // Collect first, then rewrite: `markPageBreaks` replaces a container's whole
    // content array, which is not something to do mid-traversal.
    const containers: Ast.Environment[] = [];
    visit(
        tree,
        (node) => {
            if (isPageContainerEnvironment(node)) {
                containers.push(node);
            }
        },
        { test: match.anyEnvironment }
    );

    for (const container of containers) {
        container.content = markPageBreaks(container.content);
    }
}

/**
 * Rewrite one container's content, marking each page break at top level.
 */
function markPageBreaks(content: Ast.Node[]): Ast.Node[] {
    const marked: Ast.Node[] = [];
    for (const child of content) {
        if (isPageBreakMacro(child)) {
            marked.push(pageBreakMarker());
            continue;
        }
        // A break nested somewhere inside this child (the usual case for the
        // exam class, where `cleanEnumerateBody` attaches a `\question`'s whole
        // body as an argument) becomes a boundary after the child: PreTeXt can
        // divide a worksheet between blocks, but not inside one.
        const hoisted = removePageBreaksFrom(child);
        marked.push(child);
        if (hoisted) {
            marked.push(pageBreakMarker());
        }
    }
    return marked;
}

/**
 * Strip every page break from `node`'s subtree, reporting whether there was one.
 *
 * A nested worksheet-like container is left untouched: it gets its own pass, and
 * its breaks divide *its* pages, not the outer container's.
 */
function removePageBreaksFrom(node: Ast.Node | Ast.Argument): boolean {
    if (node.type !== "argument" && isPageContainerEnvironment(node)) {
        return false;
    }

    let found = false;

    // Macro/environment arguments -- where a `\question`'s body lives.
    const args = (node as Ast.Macro).args;
    if (Array.isArray(args)) {
        for (const argument of args) {
            found = removePageBreaksFrom(argument) || found;
        }
    }

    // `content` is a string for `verbatim`/`verb`/`comment` nodes, so guard.
    const content = (node as { content?: unknown }).content;
    if (Array.isArray(content)) {
        for (let i = content.length - 1; i >= 0; i--) {
            const child = content[i] as Ast.Node;
            if (isPageBreakMacro(child)) {
                content.splice(i, 1);
                found = true;
            } else if (removePageBreaksFrom(child)) {
                found = true;
            }
        }
    }

    return found;
}

/**
 * Group worksheet/handout content into `<page>` elements at the markers left by
 * `hoistPageBreaks`.
 *
 * Must run after environment replacement (so the `<worksheet>`/`<handout>` tags
 * and their `<introduction>`-like children exist) and after every `wrapPars`
 * call (so a `<page>` never gets pushed inside a `<p>`).
 */
export function splitWorksheetPages(tree: Ast.Root): void {
    // The division form is still a `_worksheet`/`_handout` environment.
    const divisions: Ast.Environment[] = [];
    visit(
        tree,
        (node) => {
            if (isPrintoutDivisionEnvironment(node)) {
                divisions.push(node);
            }
        },
        { test: match.anyEnvironment }
    );
    for (const division of divisions) {
        division.content = intoPages(division.content);
    }

    // The `\begin{worksheet}` and exam `questions` forms are html-like tags.
    replaceNode(tree, (node) => {
        if (!isHtmlLikeTag(node)) {
            return;
        }
        const { tag, attributes, content } = extractFromHtmlLike(node);
        if (tag !== "worksheet" && tag !== "handout") {
            return;
        }
        const paged = intoPages(content);
        if (paged === content) {
            return;
        }
        return htmlLike({ tag, attributes, content: paged });
    });
}

/**
 * Tags that the schema places before the pages of a printout, and after them.
 * They are divisions in their own right and must stay outside the `<page>`s.
 */
const PRE_PAGE_TAGS = new Set(["title", "objectives", "introduction"]);
const POST_PAGE_TAGS = new Set(["conclusion", "outcomes"]);

function isTaggedOneOf(node: Ast.Node, tags: Set<string>): boolean {
    return (
        isHtmlLikeTag(node) &&
        tags.has(extractFromHtmlLike(node as Ast.Macro).tag)
    );
}

/**
 * Split `content` at its page-break markers, wrapping each run of blocks in a
 * `<page>`. Returns `content` unchanged when it holds no markers, and strips the
 * markers without paging when they don't actually divide anything.
 */
function intoPages(content: Ast.Node[]): Ast.Node[] {
    if (!content.some(isPageBreakMarker)) {
        return content;
    }

    // Peel off the front/back matter the schema keeps outside the pages, taking
    // any whitespace and comments around it along for the ride.
    let bodyStart = 0;
    while (
        bodyStart < content.length &&
        (isTaggedOneOf(content[bodyStart], PRE_PAGE_TAGS) ||
            !hasMeaningfulContent([content[bodyStart]]))
    ) {
        bodyStart++;
    }
    let bodyEnd = content.length;
    while (
        bodyEnd > bodyStart &&
        (isTaggedOneOf(content[bodyEnd - 1], POST_PAGE_TAGS) ||
            !hasMeaningfulContent([content[bodyEnd - 1]]))
    ) {
        bodyEnd--;
    }

    const head = content.slice(0, bodyStart);
    const body = content.slice(bodyStart, bodyEnd);
    const tail = content.slice(bodyEnd);

    const pages: Ast.Node[] = [];
    let current: Ast.Node[] = [];

    const closePage = () => {
        const nodes = current;
        current = [];
        if (hasMeaningfulContent(nodes)) {
            pages.push(htmlLike({ tag: "page", content: nodes }));
        } else {
            // Nothing but whitespace or comments between two breaks: there is no
            // page here, but a comment shouldn't be thrown away either, so carry
            // it onto the next page.
            current = nodes;
        }
    };

    for (const node of body) {
        if (isPageBreakMarker(node)) {
            closePage();
            continue;
        }
        current.push(node);
    }
    closePage();

    // One page is no division at all -- it means the only breaks were at the very
    // start or end of the worksheet, where they say nothing about where pages
    // split. Leave the body as plain blocks rather than adding a `<page>` that
    // carries no information.
    if (pages.length < 2) {
        return [
            ...head,
            ...body.filter((node) => !isPageBreakMarker(node)),
            ...tail,
        ];
    }

    return [...head, ...pages, ...tail];
}
