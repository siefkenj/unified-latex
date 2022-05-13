import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import { trim } from "../../unified-latex-util-trim";

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

    /**
     * Push and clear the contents of `currBody` to the return array.
     * If there are any contents, it should be wrapped in an array.
     */
    function pushBody() {
        if (currBody.length > 0) {
            trim(currBody);
            ret.push({ content: currBody, wrapInPar: true });
            currBody = [];
        }
    }

    for (const node of nodes) {
        if (isParBreakingMacro(node)) {
            pushBody();
            ret.push({ content: [node], wrapInPar: false });
            continue;
        }
        if (match.anyEnvironment(node) && !isEnvThatShouldNotBreakPar(node)) {
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
