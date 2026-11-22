import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { getMarkerWorkspace, isWorkspaceMarker } from "./workspace-marker";

/**
 * Takes an array of nodes and splits it into chunks that should be wrapped
 * in HTML `<p>...</p>` tags, vs. not. By default environments are not wrapped
 * unless they are specified, and macros are included in a par unless they are excluded.
 *
 */
export function splitForPars(
    nodes: Ast.Node[],
    options: {
        macrosThatBreakPars: string[];
        environmentsThatDontBreakPars: string[];
    }
): { content: Ast.Node[]; wrapInPar: boolean; workspace?: string }[] {
    const ret: {
        content: Ast.Node[];
        wrapInPar: boolean;
        workspace?: string;
    }[] = [];
    let currBody: Ast.Node[] = [];
    trim(nodes);

    const isParBreakingMacro = match.createMacroMatcher(
        options.macrosThatBreakPars
    );
    const isEnvThatShouldNotBreakPar = match.createEnvironmentMatcher(
        options.environmentsThatDontBreakPars
    );

    // Environments are converted into html-like macros before a containing
    // environment's content gets split for pars (replacement runs bottom-up),
    // so by this point a former environment is indistinguishable from an
    // inline macro except for this marker (see `markAsBlockLevel` in
    // unified-latex-plugin-to-pretext-like.ts). Treat it the same way an
    // unconverted `environment` node is treated above: as its own
    // paragraph-breaking boundary, never merged into a `<p>`.
    const isMarkedBlockLevel = (node: Ast.Node): boolean =>
        Boolean((node._renderInfo as { isBlockLevel?: boolean } | undefined)?.isBlockLevel);

    /**
     * Push and clear the contents of `currBody` to the return array.
     * If there are any contents, it should be wrapped in an array.
     */
    function pushBody(workspace?: string) {
        if (currBody.length > 0) {
            trim(currBody);
            // A chunk with no real content (only comments/whitespace) should
            // not produce a `<p>`; emit it bare between paragraphs instead.
            const wrapInPar = currBody.some(
                (node) =>
                    node.type !== "comment" && node.type !== "whitespace"
            );
            ret.push({ content: currBody, wrapInPar, workspace });
            currBody = [];
        }
    }

    for (const node of nodes) {
        // A `workspace-marker` stands for a `\vspace` that should become a
        // `workspace` attribute on the paragraph it follows (see
        // vertical-space-subs.ts). It was inserted immediately after that
        // content, so the paragraph being accumulated right now is the one it
        // belongs to -- and, like the `\vspace` it replaced, it ends that
        // paragraph. A marker with nothing accumulated has no paragraph to
        // attach to and is simply dropped.
        if (isWorkspaceMarker(node)) {
            pushBody(getMarkerWorkspace(node));
            continue;
        }
        if (isParBreakingMacro(node)) {
            pushBody();
            ret.push({ content: [node], wrapInPar: false });
            continue;
        }
        // A display-math environment becomes `<md>`, which PreTeXt counts as a
        // `TextParagraphItem` -- it lives *inside* a `<p>`, never beside one, so
        // a bare `<md>` next to a paragraph is schema-invalid. Keep it in the
        // paragraph it follows rather than letting the environment check below
        // treat it as a block boundary. (`\[...\]` and `$$...$$` parse as
        // `displaymath` rather than `mathenv`, and already fall through.)
        if (node.type === "mathenv") {
            currBody.push(node);
            continue;
        }
        // The mirror case: a `verbatim` environment becomes `<pre>`, which is
        // `BlockText` and so must sit *beside* paragraphs rather than inside
        // one. The parser gives it its own node type rather than `environment`,
        // so it misses the check below and needs saying explicitly.
        if (node.type === "verbatim") {
            pushBody();
            ret.push({ content: [node], wrapInPar: false });
            continue;
        }
        if (
            (match.anyEnvironment(node) && !isEnvThatShouldNotBreakPar(node)) ||
            isMarkedBlockLevel(node)
        ) {
            pushBody();
            ret.push({ content: [node], wrapInPar: false });
            continue;
        }
        if (match.parbreak(node) || match.macro(node, "par")) {
            pushBody();
            continue;
        }
        currBody.push(node);
    }
    pushBody();

    return ret;
}
