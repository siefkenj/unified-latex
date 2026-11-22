import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";

/**
 * Placeholder macro left behind by `attachVerticalSpaceWorkspace` when a
 * vertical-spacing command should become a `workspace` attribute on a `<p>`.
 *
 * `<p>` tags don't exist yet when that pass runs -- they're created much later,
 * by `wrapPars` -- so the workspace value has to ride along in the tree until
 * then. The marker is inserted immediately after the content it applies to, so
 * `splitForPars` can hand it to whichever paragraph it closes.
 *
 * `-` can't occur in a macro name parsed from real LaTeX, so this can never
 * collide with an author's macro.
 */
export const WORKSPACE_MARKER = "workspace-marker";

export function workspaceMarker(workspace: string): Ast.Macro {
    return {
        type: "macro",
        content: WORKSPACE_MARKER,
        _renderInfo: { workspace },
    };
}

export function isWorkspaceMarker(node: Ast.Node): node is Ast.Macro {
    return match.macro(node, WORKSPACE_MARKER);
}

export function getMarkerWorkspace(node: Ast.Node): string | undefined {
    return (node._renderInfo as { workspace?: string } | undefined)?.workspace;
}

/**
 * Remove any markers that no `wrapPars` call ever consumed.
 *
 * A marker only turns into an attribute if the content around it eventually
 * gets split into paragraphs. That doesn't always happen -- e.g. a `\vspace`
 * inside a `\footnote{...}` argument, or inside an environment converted with
 * `wrapContentInPars: false`. Those workspace values are dropped (a `<fn>` has
 * nowhere to put one), but the marker itself must not leak into the output.
 */
export function removeWorkspaceMarkers(tree: Ast.Root): void {
    visit(
        tree,
        (nodes) => {
            for (let i = nodes.length - 1; i >= 0; i--) {
                if (isWorkspaceMarker(nodes[i])) {
                    nodes.splice(i, 1);
                }
            }
        },
        { includeArrays: true, test: Array.isArray }
    );
}
