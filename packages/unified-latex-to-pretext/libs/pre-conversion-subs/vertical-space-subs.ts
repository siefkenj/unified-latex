import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { workspaceMarker } from "../workspace-marker";
import { pretextTagForEnvironment } from "./environment-subs";

/**
 * `\vspace`, `\vfil`/`\vfill`, and `\vskip <dimen>` have no PreTeXt equivalent as
 * standalone content. But inside a worksheet/handout/project-like environment
 * they're standing in for blank space the author wants reserved -- e.g. room for
 * a handwritten answer after an exam question, or after a paragraph of
 * instructions on a handout. PreTeXt spells that as a `workspace` attribute, so
 * we move the spacer onto the block it follows instead of dropping it.
 *
 * Anywhere else, `workspace` has no PreTeXt meaning (there's no reserved-space
 * concept outside these printout contexts -- see `sanitize-workspace` in
 * PreTeXt's `pretext-common.xsl`), so the spacer is just silently removed rather
 * than converted or left to fall through to the generic "no equivalent tag"
 * warning/TODO handling.
 *
 * Which block gets the attribute:
 *   1. A spacer trailing the *entire body* of a block that accepts `workspace`
 *      lands on that block. This is the exercise/task case: `\question ...\vfill`
 *      means "leave room to work this problem", i.e. `<exercise workspace="1in">`.
 *   2. Otherwise it lands on the block it directly follows -- a preceding
 *      environment, or the paragraph the preceding text will become. A `\vspace`
 *      between two paragraphs of a theorem belongs on the first paragraph, not
 *      on the theorem.
 *   3. If there's nothing before it, or the block it follows can't carry a
 *      `workspace`, it's dropped.
 */

export function isWhitespaceLike(node: Ast.Node): boolean {
    return node.type === "whitespace" || node.type === "comment";
}

/**
 * PreTeXt elements that accept a `workspace` attribute. Taken from the RelaxNG
 * schema (`pretext.rng`), where exactly eight definitions declare one:
 * `DefinitionLike`, `Proof`, `TheoremLike`, `ExampleLike`, `ProjectLike`, `task`,
 * `exercise`, and `p`.
 *
 * Notably `<worksheet>` and `<handout>` are *not* in the list -- they only take
 * `PrintoutAttributes` (margins) -- so a spacer trailing a worksheet body has to
 * move onto something inside it rather than onto the worksheet itself.
 */
const WORKSPACE_ATTRIBUTE_TAGS = new Set([
    // DefinitionLike
    "definition",
    // Proof
    "proof",
    // TheoremLike
    "theorem",
    "lemma",
    "corollary",
    "claim",
    "proposition",
    "algorithm",
    "fact",
    "identity",
    // ExampleLike
    "example",
    "question",
    "problem",
    // ProjectLike
    "activity",
    "investigation",
    "exploration",
    "project",
    // and these two directly
    "task",
    "exercise",
]);

/**
 * The PreTeXt element each exam-class item macro becomes (see exam-subs.ts).
 * Duplicated here rather than imported because exam-subs.ts imports from this
 * module, and a cycle between the two would be needlessly fragile.
 */
const EXAM_ITEM_TAGS: Record<string, string> = {
    question: "exercise",
    part: "task",
    subpart: "task",
    subsubpart: "task",
};

/**
 * Environments whose descendants may turn a vertical-spacing command into a
 * `workspace` attribute. `_worksheet`/`_handout` are the environments
 * `breakOnBoundaries` creates from the `\worksheet`/`\handout` division macros;
 * `worksheet`/`handout` are their direct `\begin{...}` environment forms.
 * `activity`/`exploration`/`investigation`/`project` are PreTeXt's ProjectLike
 * environments. `questions` is the exam-class list environment: every
 * `\question`/`\part`/`\subpart`/`\subsubpart` is necessarily nested inside one
 * (that's required by the exam class), and `questionsToExercises` always wraps
 * its output in a `<worksheet>` (see exam-subs.ts), so it counts too even though
 * it hasn't been converted to a `worksheet`/`_worksheet` environment yet at the
 * point this pass runs.
 */
const WORKSHEET_LIKE_ENVIRONMENTS = [
    "_worksheet",
    "_handout",
    "worksheet",
    "handout",
    "activity",
    "exploration",
    "investigation",
    "project",
    "questions",
];

const isWorksheetLikeEnvironment = match.createEnvironmentMatcher(
    WORKSHEET_LIKE_ENVIRONMENTS
);

/**
 * Does `container` live inside (or *is*) a worksheet/handout/project-like
 * environment? `parents` is ordered from the immediate parent outward, so this
 * checks the whole ancestor chain, not just the immediate container.
 */
function livesInsideWorksheetLikeEnvironment(
    container: Ast.Node | Ast.Argument,
    parents: readonly (Ast.Node | Ast.Argument)[]
): boolean {
    const chain =
        container.type === "argument" ? parents : [container, ...parents];
    return chain.some((node) => isWorksheetLikeEnvironment(node));
}

/**
 * A complete TeX dimension, e.g. `1in`, `-2.5cm`, split into sign, number, unit.
 */
const DIMEN_RE =
    /^([+-]?)(\d+\.?\d*|\.\d+)(pt|pc|in|bp|cm|mm|dd|cc|sp|ex|em|mu)$/;

/**
 * An infinite stretch/shrink component of TeX glue, e.g. `2fil`, `1filll`.
 */
const FIL_RE = /^[+-]?(\d+\.?\d*|\.\d+)fill{0,2}$/;

/**
 * Text that isn't a dimension yet but could still grow into one as more string
 * nodes are appended (`-`, `1`, `1.`, `1.5`, `1.5c`).
 */
const PARTIAL_DIMEN_RE = /^[+-]?((\d+\.?\d*|\.\d+)[a-z]{0,3})?$/;

/**
 * How much room `\vfil`/`\vfill` asks for. TeX's answer is "all of it", which
 * has no `workspace` equivalent -- PreTeXt wants a concrete length -- so this is
 * an arbitrary but roomy stand-in.
 */
const VFILL_WORKSPACE = "1in";

/**
 * A `workspace` is an amount of blank space to reserve, so only a positive
 * dimension means anything there. `\vspace{-1em}` is a formatting nudge, and
 * `\vspace{\baselineskip}` names a length that only TeX can resolve; PreTeXt
 * would reject either and substitute a default 2in (see `sanitize-workspace` in
 * `pretext-common.xsl`), so drop them rather than emit a value it can't use.
 */
function normalizeWorkspaceValue(raw: string): string | undefined {
    const value = raw.replace(/\s+/g, "");

    // `\vspace{\fill}` is `\vfill` spelled the long way.
    if (value === "\\fill") {
        return VFILL_WORKSPACE;
    }

    const dimen = DIMEN_RE.exec(value);
    if (!dimen) {
        return undefined;
    }
    const [, sign, size] = dimen;
    return sign !== "-" && Number(size) > 0 ? value : undefined;
}

function getVspaceWorkspace(node: Ast.Macro): string | undefined {
    const args = getArgsContent(node);
    for (let i = args.length - 1; i >= 0; i--) {
        const argContent = args[i];
        if (!argContent || argContent.length === 0) {
            continue;
        }
        const value = printRaw(argContent).trim();
        if (value) {
            return normalizeWorkspaceValue(value);
        }
    }
    return undefined;
}

/**
 * Read one dimension (or, when `allowFil`, an infinite glue component) starting
 * at `from`.
 *
 * The parser splits strings on non-word characters, so a dimension rarely
 * arrives as one node: `1.5cm` comes through as `1.5` followed by `cm`. Skip
 * whitespace -- `\vskip 1 in` is legal TeX -- and keep appending string nodes
 * until they spell something complete.
 */
function readDimen(
    nodes: Ast.Node[],
    from: number,
    allowFil = false
): { value: string; end: number } | undefined {
    let value = "";
    for (let i = from; i < nodes.length; i++) {
        const node = nodes[i];
        if (isWhitespaceLike(node)) {
            continue;
        }
        if (node.type !== "string") {
            return undefined;
        }
        value += node.content.trim();
        if (DIMEN_RE.test(value) || (allowFil && FIL_RE.test(value))) {
            return { value, end: i + 1 };
        }
        if (!PARTIAL_DIMEN_RE.test(value)) {
            return undefined;
        }
    }
    return undefined;
}

/**
 * Index of the next node at or after `from` that isn't whitespace or a comment.
 */
function nextMeaningfulIndex(nodes: Ast.Node[], from: number): number {
    for (let i = from; i < nodes.length; i++) {
        if (!isWhitespaceLike(nodes[i])) {
            return i;
        }
    }
    return -1;
}

/**
 * `\vskip <glue>` is a TeX primitive: its argument is a bare token sequence
 * rather than a macro argument, so it has to be parsed out of the nodes that
 * follow.
 *
 * Returns the natural size and the index just past the last node consumed, or
 * `undefined` if what follows `\vskip` isn't glue at all (in which case the
 * macro is left alone, and `dropped-subs.ts` warns about it). `workspace` is
 * absent for glue that can't reserve space, e.g. `\vskip -0.5em` -- the tokens
 * are still consumed so they don't leak out as body text.
 *
 * The optional `plus`/`minus` components say how TeX may stretch or shrink the
 * space, which has no bearing on how much room we're reserving, so they're
 * consumed and discarded.
 */
function readVskipGlue(
    nodes: Ast.Node[],
    macroIndex: number
): { workspace?: string; end: number } | undefined {
    const natural = readDimen(nodes, macroIndex + 1);
    if (!natural) {
        return undefined;
    }

    let end = natural.end;
    for (const keyword of ["plus", "minus"]) {
        const keywordIndex = nextMeaningfulIndex(nodes, end);
        const keywordNode = keywordIndex >= 0 ? nodes[keywordIndex] : undefined;
        if (
            !keywordNode ||
            keywordNode.type !== "string" ||
            keywordNode.content.trim() !== keyword
        ) {
            continue;
        }
        const component = readDimen(nodes, keywordIndex + 1, true);
        if (component) {
            end = component.end;
        }
    }

    return { workspace: normalizeWorkspaceValue(natural.value), end };
}

/**
 * If a vertical-spacing command starts at `index`, return the half-open span
 * `[start, end)` of nodes it occupies, along with the workspace value it
 * represents (e.g. `"1in"`) when it names one. The span is removed either way;
 * a missing `workspace` just means there's nothing to record.
 */
function matchVerticalSpaceAt(
    nodes: Ast.Node[],
    index: number
): { workspace?: string; start: number; end: number } | undefined {
    const node = nodes[index];
    if (!match.anyMacro(node)) {
        return undefined;
    }

    if (match.macro(node, "vfill") || match.macro(node, "vfil")) {
        return { workspace: VFILL_WORKSPACE, start: index, end: index + 1 };
    }

    if (match.macro(node, "vspace")) {
        return {
            workspace: getVspaceWorkspace(node),
            start: index,
            end: index + 1,
        };
    }

    if (match.macro(node, "vskip")) {
        const glue = readVskipGlue(nodes, index);
        return glue
            ? { workspace: glue.workspace, start: index, end: glue.end }
            : undefined;
    }

    return undefined;
}

/**
 * Index of the last node before `from` that isn't whitespace, a comment, or a
 * parbreak, or `-1` if there is none. A parbreak is skipped so that
 *
 *     Para one.
 *
 *     \vspace{1in}
 *
 * still attaches to "Para one." rather than falling off the front.
 */
function previousMeaningfulIndex(nodes: Ast.Node[], from: number): number {
    for (let i = from; i >= 0; i--) {
        const node = nodes[i];
        if (isWhitespaceLike(node) || match.parbreak(node)) {
            continue;
        }
        return i;
    }
    return -1;
}

function onlyWhitespaceFrom(nodes: Ast.Node[], from: number): boolean {
    for (let i = from; i < nodes.length; i++) {
        if (!isWhitespaceLike(nodes[i]) && !match.parbreak(nodes[i])) {
            return false;
        }
    }
    return true;
}

/**
 * The node a spacer trailing all of `container`'s content should attach to, if
 * that container becomes an element which accepts `workspace`.
 *
 *  - An environment body trails into the environment itself.
 *  - An exam item macro's body is attached as an argument (by
 *    `cleanEnumerateBody`), so a spacer trailing it belongs on the
 *    `<exercise>`/`<task>` that macro becomes.
 *
 * Everything else -- a `\footnote` argument, a group, the document root --
 * returns `undefined`, and the spacer falls through to the preceding block.
 */
function workspaceCapableContainer(
    container: Ast.Node | Ast.Argument,
    parents: readonly (Ast.Node | Ast.Argument)[]
): Ast.Node | Ast.Argument | undefined {
    if (container.type === "environment") {
        const tag = pretextTagForEnvironment(container.env);
        return tag && WORKSPACE_ATTRIBUTE_TAGS.has(tag) ? container : undefined;
    }

    if (container.type === "argument") {
        const owner = parents[0];
        if (owner && owner.type === "macro") {
            const tag = EXAM_ITEM_TAGS[owner.content];
            return tag && WORKSPACE_ATTRIBUTE_TAGS.has(tag) ? owner : undefined;
        }
    }

    return undefined;
}

/**
 * Record `workspace` on a node so that `applyRenderInfoAttributes` (see
 * unified-latex-plugin-to-pretext-like.ts) copies it onto whatever html-like tag
 * the node is replaced with. Mirrors how `\label` becomes `xml:id`.
 */
function setWorkspace(target: Ast.Node | Ast.Argument, workspace: string): void {
    target._renderInfo = target._renderInfo ?? {};
    target._renderInfo.additionalAttributes =
        target._renderInfo.additionalAttributes ?? {};
    (
        target._renderInfo.additionalAttributes as Record<string, string>
    ).workspace = workspace;
}

/**
 * Scan every container in `tree` (environment bodies, macro arguments, groups,
 * ...) for vertical-spacing commands and move each one onto the block it
 * follows, as a `workspace` attribute. Must run on the raw LaTeX AST, before
 * conversion to html-like nodes: it records the attribute on
 * `_renderInfo.additionalAttributes` for downstream replacement factories to
 * pick up, and leaves a `workspace-marker` behind when the target is a
 * paragraph `wrapPars` hasn't created yet.
 */
export function attachVerticalSpaceWorkspace(tree: Ast.Root): void {
    visit(
        tree,
        (node, info) => {
            const container = node as (Ast.Node | Ast.Argument) & {
                content: Ast.Node[];
            };
            const eligible = livesInsideWorksheetLikeEnvironment(
                container,
                info.parents
            );

            // Walk backwards so that removing a spacer never disturbs an index
            // we haven't visited yet.
            for (let i = container.content.length - 1; i >= 0; i--) {
                const spacer = matchVerticalSpaceAt(container.content, i);
                if (!spacer) {
                    continue;
                }
                const { workspace, start, end } = spacer;
                const trailing = onlyWhitespaceFrom(container.content, end);

                // Always remove the spacer: even outside a qualifying
                // environment, it has no PreTeXt equivalent and should be
                // silently dropped rather than left for the generic
                // macro-replacement/TODO handling to warn about.
                container.content.splice(start, end - start);
                i = start;

                if (!eligible || !workspace) {
                    continue;
                }

                // 1. Trailing the whole body of a block that takes `workspace`.
                if (trailing) {
                    const target = workspaceCapableContainer(
                        container,
                        info.parents
                    );
                    if (target) {
                        setWorkspace(target, workspace);
                        continue;
                    }
                }

                const prevIndex = previousMeaningfulIndex(
                    container.content,
                    start - 1
                );
                if (prevIndex < 0) {
                    // 3. Nothing to attach to.
                    continue;
                }

                // 2a. The spacer follows a block. This pass runs before any
                // conversion to html-like nodes, so every block is still a plain
                // `environment` node. If that block can't carry a `workspace`
                // (a list, a figure, ...) the spacer is dropped -- it must not
                // fall through and land on some paragraph inside the block.
                const prev = container.content[prevIndex];
                if (prev.type === "environment") {
                    const tag = pretextTagForEnvironment(prev.env);
                    if (tag && WORKSPACE_ATTRIBUTE_TAGS.has(tag)) {
                        setWorkspace(prev, workspace);
                    }
                    continue;
                }

                // 2b. The spacer follows inline content, which will become a
                // `<p>` -- an element that does take `workspace`. Leave a marker
                // right after that content for `wrapPars` to pick up.
                container.content.splice(
                    prevIndex + 1,
                    0,
                    workspaceMarker(workspace)
                );
            }
        },
        {
            test: (node) =>
                typeof node === "object" &&
                node != null &&
                "content" in node &&
                Array.isArray((node as { content?: unknown }).content),
        }
    );
}
