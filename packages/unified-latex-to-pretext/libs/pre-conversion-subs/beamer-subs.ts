import * as Ast from "@unified-latex/unified-latex-types";
import { arg, s } from "@unified-latex/unified-latex-builder";
import {
    attachMacroArgs,
    getArgsContent,
} from "@unified-latex/unified-latex-util-arguments";
import {
    extractFromHtmlLike,
    htmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import { anyEnvironment, match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { replaceNode } from "@unified-latex/unified-latex-util-replace";
import { EXIT, visit } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import { hasMeaningfulContent, makeWarningMessage } from "./utils";

/**
 * Beamer's text-style commands accept an overlay specification
 * (`\textbf<2>{...}`), but the parser already attached latex2e's plain `m`
 * signature to them, so the `<` was swallowed as the mandatory argument and
 * the rest (`2>{...}`) left behind as loose text. `alert` is listed too: it
 * normally gets its arguments from `provides.ts` (already overlay-aware), but
 * nothing stops a caller's parser from having attached a plain `m` first.
 */
const OVERLAY_AWARE_TEXT_MACROS: Ast.MacroInfoRecord = Object.fromEntries(
    [
        "alert",
        "emph",
        "textbf",
        "textit",
        "textmd",
        "textnormal",
        "textrm",
        "textsc",
        "textsf",
        "textsl",
        "texttt",
        "textup",
    ].map((name) => [name, { signature: "d<> m" }])
);

/**
 * Re-attach the arguments of overlay-aware text macros whose overlay
 * specification was swallowed by a plain `m` signature (see
 * `OVERLAY_AWARE_TEXT_MACROS`). The overlay itself is then ignored by the
 * replacements, which read the last argument, so `\textbf<2>{x}` is simply
 * bold text.
 */
export function reattachOverlayArgs(tree: Ast.Root): void {
    const isOverlayAware = match.createMacroMatcher(OVERLAY_AWARE_TEXT_MACROS);
    replaceNode(tree, (node) => {
        if (!isOverlayAware(node) || node.args?.length !== 1) {
            return;
        }
        const [first] = node.args;
        if (printRaw(first.content) !== "<") {
            return;
        }
        // The parser records an unbraced one-token argument with `{`/`}` marks
        // too, so tell `\textbf<` from `\textbf{<}` by where the `<` sits:
        // right after the macro name, or one brace later.
        const macroEnd = node.position?.end.offset;
        const argStart = first.content[0].position?.start.offset;
        if (macroEnd != null && argStart != null && argStart !== macroEnd) {
            return;
        }
        // Put the swallowed `<` back in the stream and let the overlay-aware
        // signature gobble `<...>{...}` afresh.
        return [{ ...node, args: undefined }, ...first.content];
    });
    attachMacroArgs(tree, OVERLAY_AWARE_TEXT_MACROS);
}

const NOTE_MACRO: Ast.MacroInfoRecord = {
    note: { signature: "d<> o m" },
};

/**
 * Beamer's speaker notes, `\note<overlay>[options]{text}`, have no PreTeXt
 * element. Keeping the text as an XML comment preserves it for the author
 * without showing it on the slide. Runs before any other substitution, so the
 * comment holds the note exactly as written rather than half-converted markup.
 */
export function notesToComments(tree: Ast.Root, file?: VFile): void {
    attachMacroArgs(tree, NOTE_MACRO);
    replaceNode(tree, (node, info) => {
        if (
            info.context.hasMathModeAncestor ||
            !match.macro(node, "note") ||
            !node.args
        ) {
            return;
        }
        warn(
            file,
            node,
            `Warning: PreTeXt has no speaker notes; beamer's "\\note" was kept as an XML comment.`
        );
        const args = getArgsContent(node);
        const text = printRaw(args[args.length - 1] || []).trim();
        const comment: Ast.Comment = {
            type: "comment",
            content: ` note: ${text} `,
            sameline: true,
        };
        return comment;
    });
}

/**
 * Does this LaTeX source describe a slideshow? True for the beamer document
 * class or a `\slideshow{Title}` root, or when any frame is present -- a
 * `frame`/`slide` environment can only become a PreTeXt `<slide>`, which is
 * only legal inside `<slideshow>`.
 */
export function isSlideshowSource(tree: Ast.Root): boolean {
    let found = false;
    visit(tree, (node) => {
        if (match.macro(node, "slideshow")) {
            found = true;
            return EXIT;
        }
        if (match.macro(node, "documentclass")) {
            const args = getArgsContent(node);
            const docClass = printRaw(args[args.length - 1] || []).trim();
            if (docClass === "beamer") {
                found = true;
                return EXIT;
            }
        } else if (
            match.environment(node, "frame") ||
            match.environment(node, "slide")
        ) {
            found = true;
            return EXIT;
        }
    });
    return found;
}

/**
 * Beamer's macro form of a frame, `\frame<overlay>[default overlay][options]{body}`.
 * Only meaningful in a slideshow: in LaTeX2e, `\frame{...}` draws a box.
 */
const FRAME_MACRO: Ast.MacroInfoRecord = {
    frame: { signature: "d<> o o m" },
};

/**
 * Turn every `\frame{...}` macro into the `frame` environment it abbreviates,
 * so the rest of the pipeline (paragraph wrapping, `beamerFrameFactory`) has a
 * single form to handle. The environment's argument list is laid out like
 * beamer's `frame` signature (`!d<> !o !o !d{} !d{}`); the macro form cannot
 * carry a braced title, so those two slots are empty.
 */
export function frameMacrosToEnvironments(tree: Ast.Root): void {
    attachMacroArgs(tree, FRAME_MACRO);
    replaceNode(tree, (node) => {
        if (!match.macro(node, "frame") || !node.args) {
            return;
        }
        const args = node.args;
        const body = args[args.length - 1]?.content ?? [];
        const empty = () => arg([], { openMark: "", closeMark: "" });
        const frame: Ast.Environment = {
            type: "environment",
            env: "frame",
            content: body,
            args: [...args.slice(0, 3), empty(), empty()],
            position: node.position,
        };
        return frame;
    });
}

/**
 * PreTeXt slideshows hold `<section>`s of `<slide>`s and nothing deeper, so
 * beamer's other structural macros have to be flattened before
 * `breakOnBoundaries` turns them into divisions:
 *   * `\subsection`/`\subsubsection`/`\part` are dropped, leaving their frames
 *     in the enclosing section;
 *   * `\appendix` becomes a section titled "Appendix" when the deck has
 *     sections (so the backup slides stay set apart), and is dropped otherwise.
 */
export function flattenSlideshowStructure(tree: Ast.Root, file?: VFile): void {
    let firstSection: Ast.Macro | undefined;
    visit(tree, (node) => {
        if (match.macro(node, "section") && node.args) {
            firstSection = node;
            return EXIT;
        }
    });

    replaceNode(tree, (node, info) => {
        if (info.context.hasMathModeAncestor || !match.anyMacro(node)) {
            return;
        }
        const name = node.content;
        if (
            name === "subsection" ||
            name === "subsubsection" ||
            name === "part"
        ) {
            warn(
                file,
                node,
                `Warning: A slideshow has no "\\${name}" level; the division was dropped and its slides kept in the enclosing section.`
            );
            return null;
        }
        if (name === "appendix") {
            if (!firstSection) {
                warn(
                    file,
                    node,
                    `Warning: "\\appendix" has no equivalent in a slideshow without sections; it was dropped.`
                );
                return null;
            }
            return sectionTitled(firstSection, "Appendix");
        }
    });
}

/**
 * A `\section` macro with the given title, shaped like `template` (same
 * signature and `namedArguments`, so `breakOnBoundaries` reads it the same way).
 */
function sectionTitled(template: Ast.Macro, title: string): Ast.Macro {
    const args = template.args ?? [];
    return {
        type: "macro",
        content: "section",
        _renderInfo: template._renderInfo,
        args: args.map((a, i) =>
            i === args.length - 1
                ? arg([s(title)], { openMark: "{", closeMark: "}" })
                : arg([], { openMark: "", closeMark: "" })
        ),
    };
}

const TITLE_PAGE_MACROS = ["titlepage", "maketitle"];

/**
 * Macros that produce no content of their own on a slide, so a frame holding
 * only these (and whitespace) is empty for our purposes. The navigation ones
 * are how beamer builds outline and section-divider frames, which PreTeXt
 * generates itself (or not at all).
 */
const NAVIGATION_MACROS = [
    "tableofcontents",
    "sectionpage",
    "subsectionpage",
    "partpage",
    "insertsectionnavigation",
    "insertsubsectionnavigation",
];
const NO_OP_MACROS = [
    "centering",
    "raggedright",
    "raggedleft",
    "par",
    "noindent",
    "vfill",
    "hfill",
    "vspace",
    "hspace",
    "smallskip",
    "medskip",
    "bigskip",
    "tiny",
    "scriptsize",
    "footnotesize",
    "small",
    "normalsize",
    "large",
    "Large",
    "LARGE",
    "huge",
    "Huge",
];
const NO_OP_ENVIRONMENTS = ["center", "flushleft", "flushright"];

/**
 * Is there nothing on this frame body a reader would see, once `ignoredMacros`
 * are set aside? Recurses through groups, `center`-style wrappers, and the
 * `<p>` tags the paragraph pre-pass may already have added.
 */
function isEffectivelyEmpty(
    nodes: Ast.Node[],
    ignoredMacros: readonly string[]
): boolean {
    return nodes.every((node) => {
        if (!hasMeaningfulContent([node])) {
            return true;
        }
        if (match.group(node)) {
            return isEffectivelyEmpty(node.content, ignoredMacros);
        }
        if (match.anyMacro(node)) {
            const name = node.content;
            if (!isHtmlLikeTag(node)) {
                return ignoredMacros.includes(name);
            }
            const { tag, content } = extractFromHtmlLike(node);
            return tag === "p" && isEffectivelyEmpty(content, ignoredMacros);
        }
        if (anyEnvironment(node)) {
            return (
                NO_OP_ENVIRONMENTS.includes(printRaw(node.env)) &&
                isEffectivelyEmpty(node.content, ignoredMacros)
            );
        }
        return false;
    });
}

/**
 * Is this frame body nothing but navigation (an outline, a section page)?
 * Such a frame is dropped rather than emitted as an empty `<slide>`.
 */
export function isNavigationOnlyFrame(content: Ast.Node[]): boolean {
    const isNavigation = (nodes: Ast.Node[]): boolean => {
        let found = false;
        visit(nodes, (node) => {
            if (
                match.anyMacro(node) &&
                NAVIGATION_MACROS.includes(node.content)
            ) {
                found = true;
                return EXIT;
            }
        });
        return found;
    };
    return (
        isNavigation(content) &&
        isEffectivelyEmpty(content, [...NAVIGATION_MACROS, ...NO_OP_MACROS])
    );
}

/**
 * Handle beamer's title frame: a frame whose body calls `\titlepage` (or
 * `\maketitle`). In PreTeXt the title slide is generated from the document's
 * `<frontmatter>` (title, subtitle, authors, date), so the title-page macro
 * itself is removed. If nothing else was on the frame it is dropped; otherwise
 * the remaining content stays where it was, as an ordinary slide right after
 * the generated title slide. `\titlegraphic` content, which beamer draws on the
 * title page, is appended to that slide (creating it if needed).
 *
 * Returns whether a title frame was found, which tells the caller the
 * document needs a `<frontmatter>` even if no bibliographic info was given.
 */
export function convertTitleFrames(
    tree: Ast.Root,
    titlegraphic: Ast.Node[] | undefined,
    file?: VFile
): boolean {
    let found = false;
    replaceNode(tree, (node) => {
        if (
            found ||
            !anyEnvironment(node) ||
            !(
                match.environment(node, "frame") ||
                match.environment(node, "slide")
            ) ||
            !containsMacro(node.content, TITLE_PAGE_MACROS)
        ) {
            return;
        }
        found = true;
        const content = removeMacros(node.content, TITLE_PAGE_MACROS);
        if (titlegraphic?.length) {
            content.push({ type: "parbreak" }, ...titlegraphic);
        }
        if (isEffectivelyEmpty(content, NO_OP_MACROS)) {
            return null;
        }
        warn(
            file,
            node,
            `Warning: The title page is generated from the document's frontmatter; the rest of the title frame's content was moved to a slide of its own.`
        );
        return { ...node, content };
    });

    if (!found && titlegraphic?.length && file) {
        file.message(
            `Warning: "\\titlegraphic" was dropped because the slideshow has no title frame.`
        );
    }
    return found;
}

/**
 * PreTeXt's schema wants a slideshow to hold either sections of slides or
 * slides alone, never both side by side -- but beamer decks routinely open with
 * a frame or two before the first `\section`. Those frames are kept where they
 * are (the reveal.js conversion renders a mix correctly, and moving them would
 * change the talk); this only warns, so the author knows why the result does
 * not validate. Call after `breakOnBoundaries`, when sections are environments.
 */
export function warnOnSlidesOutsideSections(
    tree: Ast.Root,
    file?: VFile
): void {
    const root = tree.content.find(
        (node) => anyEnvironment(node) && node.env === "_slideshow"
    ) as Ast.Environment | undefined;
    const content = root?.content ?? tree.content;
    const isFrame = (node: Ast.Node) =>
        (match.environment(node, "frame") ||
            match.environment(node, "slide")) &&
        !isNavigationOnlyFrame(node.content);
    const firstFrame = content.find(isFrame);
    const hasSection = content.some(
        (node) => anyEnvironment(node) && node.env === "_section"
    );
    if (firstFrame && hasSection) {
        warn(
            file,
            firstFrame,
            `Warning: Some slides sit outside any section. PreTeXt's schema expects a slideshow's slides to be all in sections or none; they were kept in order, but moving them into a section will make the document valid.`
        );
    }
}

function containsMacro(nodes: Ast.Node[], names: readonly string[]): boolean {
    let found = false;
    visit(nodes, (node, info) => {
        if (
            !info.context.hasMathModeAncestor &&
            match.anyMacro(node) &&
            names.includes(node.content)
        ) {
            found = true;
            return EXIT;
        }
    });
    return found;
}

function removeMacros(nodes: Ast.Node[], names: readonly string[]): Ast.Node[] {
    const root: Ast.Root = { type: "root", content: nodes };
    replaceNode(root, (node, info) => {
        if (
            !info.context.hasMathModeAncestor &&
            match.anyMacro(node) &&
            names.includes(node.content)
        ) {
            return null;
        }
    });
    return root.content;
}

// ---------------------------------------------------------------------------
// Incremental reveals
// ---------------------------------------------------------------------------

/**
 * Tags that take `pause="yes"` meaning "reveal this element as one step".
 * (Lists take it too, but on a list it means "reveal item by item", so a
 * paused list step is wrapped in `<subslide>` instead.)
 */
const PAUSABLE_TAGS = new Set(["p", "image", "sidebyside"]);
/** Macros not yet replaced when frames are built, which become a pausable tag. */
const PAUSABLE_MACROS = new Set(["includegraphics"]);

/**
 * Split a frame's body at beamer `\pause` commands into PreTeXt reveal steps.
 *
 * `\pause` breaks paragraphs (see `wrap-pars.ts`), so by the time a frame is
 * built its pauses sit between blocks at the top level of the body. Everything
 * before the first pause is shown at once; each later step becomes
 *   * its lone `<p>`, `<image>`, or `<sidebyside>` with `pause="yes"`, or
 *   * a `<subslide>` around its blocks, when there are several or the one
 *     block cannot carry `pause` (a theorem, a list, ...).
 * A step with no content (a trailing `\pause`) is dropped.
 */
export function applyPauses(content: Ast.Node[]): Ast.Node[] {
    if (!content.some((node) => match.macro(node, "pause"))) {
        return content;
    }
    const steps: Ast.Node[][] = [[]];
    for (const node of content) {
        if (match.macro(node, "pause")) {
            steps.push([]);
        } else {
            steps[steps.length - 1].push(node);
        }
    }

    const result = [...steps[0]];
    for (const step of steps.slice(1)) {
        const blocks = step.filter(isVisibleBlock);
        if (blocks.length === 0) {
            continue;
        }
        if (blocks.length === 1 && isPausable(blocks[0])) {
            result.push(
                ...step.map((node) =>
                    node === blocks[0] ? withPause(node) : node
                )
            );
        } else {
            result.push(htmlLike({ tag: "subslide", content: step }));
        }
    }
    return result;
}

function isVisibleBlock(node: Ast.Node): boolean {
    if (isHtmlLikeTag(node)) {
        const { tag, content } = extractFromHtmlLike(node);
        return tag !== "p" || hasMeaningfulContent(content);
    }
    return hasMeaningfulContent([node]);
}

function isPausable(node: Ast.Node): boolean {
    if (!match.anyMacro(node)) {
        return false;
    }
    const name = node.content;
    return isHtmlLikeTag(node)
        ? PAUSABLE_TAGS.has(extractFromHtmlLike(node).tag)
        : PAUSABLE_MACROS.has(name);
}

/**
 * Set `pause="yes"` on an html-like node, or -- for a macro that has not been
 * replaced yet -- record it in `_renderInfo`, which macro replacement copies
 * onto the tag it produces.
 */
export function withPause(node: Ast.Node): Ast.Node {
    if (isHtmlLikeTag(node)) {
        const { tag, attributes, content } = extractFromHtmlLike(node);
        const paused = htmlLike({
            tag,
            content,
            attributes: { ...attributes, pause: "yes" },
        });
        paused._renderInfo = node._renderInfo;
        return paused;
    }
    const renderInfo = node._renderInfo ?? {};
    return {
        ...node,
        _renderInfo: {
            ...renderInfo,
            additionalAttributes: {
                ...(renderInfo.additionalAttributes as object | undefined),
                pause: "yes",
            },
        },
    } as Ast.Node;
}

/**
 * Mark every list in `nodes` (at any depth) to be revealed item by item.
 * Used for a frame whose default overlay is incremental: `\begin{frame}[<+->]`.
 */
export function pauseAllLists(nodes: Ast.Node[]): Ast.Node[] {
    const root: Ast.Root = { type: "root", content: nodes };
    replaceNode(root, (node) => {
        if (isHtmlLikeTag(node)) {
            const { tag, attributes } = extractFromHtmlLike(node);
            if (
                (tag === "ul" || tag === "ol" || tag === "dl") &&
                !attributes.pause
            ) {
                return withPause(node);
            }
        }
    });
    return root.content;
}

/**
 * Is this overlay specification incremental, i.e. does it use beamer's `+`
 * counter (`<+->`, `<+-| alert@+>`, `<.->`...)?
 *
 * An `\item<...>` overlay argument arrives without its angle brackets. A
 * default overlay rides in an ordinary optional argument
 * (`\begin{itemize}[<+->]`), which may instead hold a label or frame options,
 * so for those pass `inBrackets` to require the `<...>`.
 */
export function isIncrementalOverlay(
    nodes: Ast.Node[] | null | undefined,
    { inBrackets = false }: { inBrackets?: boolean } = {}
): boolean {
    if (!nodes) {
        return false;
    }
    let spec = printRaw(nodes).trim();
    if (inBrackets) {
        const bracketed = spec.match(/^<(.*)>$/);
        if (!bracketed) {
            return false;
        }
        spec = bracketed[1];
    }
    return /[+.]/.test(spec) && spec.includes("-");
}

/**
 * The first overlay slide number of an explicit spec like `<2->` or `<3>`, or
 * `undefined` for anything else.
 */
export function overlayStart(
    nodes: Ast.Node[] | null | undefined
): number | undefined {
    if (!nodes) {
        return undefined;
    }
    const m = printRaw(nodes)
        .trim()
        .replace(/^<|>$/g, "")
        .match(/^(\d+)/);
    return m ? Number(m[1]) : undefined;
}

/**
 * Strip `\pause` from a list item's body, reporting whether there was one.
 * `\pause` between items is beamer's other spelling of an incremental list.
 */
export function removePauses(nodes: Ast.Node[]): {
    content: Ast.Node[];
    hadPause: boolean;
} {
    const hadPause = containsMacro(nodes, ["pause"]);
    return {
        content: hadPause ? removeMacros(nodes, ["pause"]) : nodes,
        hadPause,
    };
}

function warn(file: VFile | undefined, node: Ast.Node, message: string): void {
    if (!file) {
        return;
    }
    const warning = makeWarningMessage(node, message, "beamer-subs");
    file.message(warning, warning.place, warning.source);
}
