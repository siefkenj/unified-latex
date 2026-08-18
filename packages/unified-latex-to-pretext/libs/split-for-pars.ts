import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { trim } from "@unified-latex/unified-latex-util-trim";

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
): { content: Ast.Node[]; wrapInPar: boolean }[] {
    const ret: { content: Ast.Node[]; wrapInPar: boolean }[] = [];
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
    function pushBody() {
        if (currBody.length > 0) {
            trim(currBody);
            // A chunk with no real content (only comments/whitespace) should
            // not produce a `<p>`; emit it bare between paragraphs instead.
            const wrapInPar = currBody.some(
                (node) =>
                    node.type !== "comment" && node.type !== "whitespace"
            );
            ret.push({ content: currBody, wrapInPar });
            currBody = [];
        }
    }

    for (const node of nodes) {
        if (isParBreakingMacro(node)) {
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
