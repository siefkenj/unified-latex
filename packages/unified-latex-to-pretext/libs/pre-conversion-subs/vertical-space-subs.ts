import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * `\vspace`, `\vfil`/`\vfill`, and `\vskip <dimen>` have no PreTeXt equivalent as
 * standalone content. But when one appears as the *trailing* content of some
 * container (an environment body, a macro argument, ...) that lives inside a
 * worksheet/handout/project-like environment, it's standing in for blank space
 * the author wants reserved after that container — e.g. room for a handwritten
 * answer after an exam question or project task. We convert that into a
 * `workspace` attribute on the container instead of dropping it.
 *
 * Anywhere else, `workspace` has no PreTeXt meaning (there's no reserved-space
 * concept outside these worksheet-like contexts), so the trailing command is
 * just silently removed rather than converted or left to fall through to the
 * generic "no equivalent tag" warning/TODO handling.
 *
 * The exam-class conversion (`exam-subs.ts`) was the first place this was needed,
 * for `\question`/`\part`/`\subpart`/`\subsubpart` inside a `questions` environment.
 * The detection logic lives here so it can run generally, for any container inside
 * a qualifying environment, not just exam item macros.
 */

export function isWhitespaceLike(node: Ast.Node): boolean {
    return node.type === "whitespace" || node.type === "comment";
}

/**
 * Environments whose descendants may turn a trailing vertical-spacing command
 * into a `workspace` attribute. `_worksheet`/`_handout` are the environments
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

function isVfillMacro(node: Ast.Node): boolean {
    return match.macro(node, "vfill") || match.macro(node, "vfil");
}

function isVspaceMacro(node: Ast.Node): boolean {
    return match.macro(node, "vspace");
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
            return value;
        }
    }
    return undefined;
}

/**
 * If `nodes` ends (ignoring trailing whitespace/comments) with a vertical-spacing
 * command, remove it and return the remaining nodes along with the workspace value
 * it represents (e.g. `"1in"`). Otherwise, return `nodes` unchanged.
 */
export function extractTrailingVerticalSpace(nodes: Ast.Node[]): {
    nodes: Ast.Node[];
    workspace?: string;
} {
    const remaining = [...nodes];

    while (
        remaining.length > 0 &&
        isWhitespaceLike(remaining[remaining.length - 1])
    ) {
        remaining.pop();
    }

    const lastNode = remaining[remaining.length - 1];
    if (!lastNode) {
        return { nodes: remaining };
    }

    if (isVfillMacro(lastNode)) {
        remaining.pop();
        trim(remaining);
        return { nodes: remaining, workspace: "1in" };
    }

    if (isVspaceMacro(lastNode)) {
        const workspace = getVspaceWorkspace(lastNode as Ast.Macro);
        if (!workspace) {
            return { nodes: remaining };
        }

        remaining.pop();
        trim(remaining);
        return { nodes: remaining, workspace };
    }

    // `\vskip <dimen>` is a TeX primitive: the dimension is a bare token sequence
    // rather than a macro argument, so it shows up as a trailing string node.
    if (lastNode.type !== "string") {
        return { nodes: remaining };
    }

    let index = remaining.length - 2;
    while (index >= 0 && isWhitespaceLike(remaining[index])) {
        index--;
    }

    const macroNode = remaining[index];
    if (!macroNode || !match.macro(macroNode, "vskip")) {
        return { nodes: remaining };
    }

    const workspace = lastNode.content.trim();
    if (!workspace) {
        return { nodes: remaining };
    }

    remaining.splice(index);
    trim(remaining);
    return { nodes: remaining, workspace };
}

/**
 * The node a `workspace` attribute should land on when a trailing vertical-spacing
 * command is stripped from `container`'s content.
 *  - An environment/root/group's own content trails into the container itself.
 *  - An `argument`'s content trails into whichever macro/environment owns that
 *    argument — arguments are never rendered as tags of their own.
 */
function attributeTarget(
    container: Ast.Node | Ast.Argument,
    parents: readonly (Ast.Node | Ast.Argument)[]
): Ast.Node | Ast.Argument | undefined {
    if (container.type === "argument") {
        return parents[0];
    }
    return container;
}

/**
 * Scan every container in `tree` (environment bodies, macro arguments, groups, ...)
 * for a trailing vertical-spacing command, and convert it into a `workspace`
 * attribute on the container it trails. Must run on the raw LaTeX AST, before
 * conversion to html-like nodes, since it records the attribute on
 * `_renderInfo.additionalAttributes` for downstream replacement factories to
 * pick up (mirrors how `\label` is turned into `xml:id`).
 */
export function attachVerticalSpaceWorkspace(tree: Ast.Root): void {
    visit(
        tree,
        (node, info) => {
            const container = node as (Ast.Node | Ast.Argument) & {
                content: Ast.Node[];
            };
            const { nodes, workspace } = extractTrailingVerticalSpace(
                container.content
            );
            if (!workspace) {
                return;
            }

            // Always remove the trailing command: even outside a qualifying
            // environment, it has no PreTeXt equivalent and should be silently
            // dropped rather than left for the generic macro-replacement/TODO
            // handling to warn about or wrap in a `<TODO>` placeholder.
            container.content = nodes;

            if (!livesInsideWorksheetLikeEnvironment(container, info.parents)) {
                return;
            }

            const target = attributeTarget(container, info.parents);
            if (!target) {
                return;
            }

            target._renderInfo = target._renderInfo ?? {};
            target._renderInfo.additionalAttributes =
                target._renderInfo.additionalAttributes ?? {};
            target._renderInfo.additionalAttributes.workspace = workspace;
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
