import * as Ast from "@unified-latex/unified-latex-types";

/**
 * Returns the content of `args` for a macro or environment as an array. If an argument
 * was omitted (e.g., because it was an optional arg that wasn't included), then `null` is returned.
 */
export function getArgsContent(
    node: Ast.Macro | Ast.Environment
): (Ast.Node[] | null)[] {
    if (!Array.isArray(node.args)) {
        return [];
    }

    return node.args.map((arg) => {
        if (arg.openMark === "" && arg.content.length === 0) {
            return null;
        }
        return arg.content;
    });
}

/**
 * Returns the content of `args` for a macro or environment as an object whose keys are the "names"
 * of each argument. These names of the arguments must be specified in the `_renderInfo` prop. If `_renderInfo`
 * does not contain a `namedArguments` array, then an empty object will be returned.
 *
 * @namedArgumentsFallback - If `_renderInfo.namedArguments` is not provided, `namedArgumentsFallback` is ued.
 */
export function getNamedArgsContent(
    node: Ast.Macro | Ast.Environment,
    namedArgumentsFallback: readonly (string | null)[] = []
): Record<string, Ast.Node[] | null> {
    const names = node._renderInfo?.namedArguments || namedArgumentsFallback;

    if (
        !Array.isArray(node.args) ||
        !Array.isArray(names) ||
        names.length === 0
    ) {
        return {};
    }
    const ret: Record<string, Ast.Node[] | null> = {};

    node.args.forEach((arg, i) => {
        const name = names[i];
        if (name == null) {
            // If a null name was given, it shouldn't be listed as a named argument.
            return;
        }
        let val: Ast.Node[] | null = arg.content;
        if (arg.openMark === "" && arg.content.length === 0) {
            val = null;
        }
        ret[name] = val;
    });

    return ret;
}
