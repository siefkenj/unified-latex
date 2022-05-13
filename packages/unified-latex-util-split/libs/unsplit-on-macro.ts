import * as Ast from "../../unified-latex-types";

/**
 * Does the reverse of `splitOnMacro`
 */
export function unsplitOnMacro({
    segments,
    macros,
}: {
    segments: Ast.Node[][];
    macros: Ast.Node[] | Ast.Node[][];
}) {
    if (segments.length === 0) {
        console.warn("Trying to join zero segments");
        return [];
    }
    if (segments.length !== macros.length + 1) {
        console.warn(
            "Mismatch between lengths of macros and segments when trying to unsplit"
        );
    }

    let ret = segments[0];
    for (let i = 0; i < macros.length; i++) {
        // Even though the type of macros[i] is node and not array,
        // Array.concat still works
        ret = ret.concat(macros[i]).concat(segments[i + 1]);
    }

    return ret;
}
