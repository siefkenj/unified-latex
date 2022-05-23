import json5 from "json5";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    newcommandMacroToName,
    newcommandMacroToSpec,
    newcommandMacroToSubstitutionAst,
} from "@unified-latex/unified-latex-util-macros";
import { parse } from "@unified-latex/unified-latex-util-parse";

/**
 * Parse a macro specification given on the command line as either a "\newcommand" string
 * or a JSON object specifying `name`, `signature`, and `body`.
 */
export function parseMacroExpansion(def: string): {
    name: string;
    signature: string;
    body: Ast.Node[];
} {
    if (def.startsWith("\\")) {
        const macro = parse(def).content[0] as Ast.Macro;
        const name = newcommandMacroToName(macro);
        if (!name) {
            // If there was no name specified, it must not have been a `\newcommand` or other recognized macro
            throw new Error(
                `Could extract macro definition from "${def}"; expected the macro to be defined via \\newcommand or similar syntax`
            );
        }
        const signature = newcommandMacroToSpec(macro);
        const body = newcommandMacroToSubstitutionAst(macro);

        return { name, signature, body };
    }
    // If it wasn't specified via a `\newcommand` macro, assume it's specified as JSON
    const parsedSpec = json5.parse(def);
    if (parsedSpec.name == null || parsedSpec.body == null) {
        throw new Error(
            `Expected a "name" field and a "body" field to be defined on ${def}`
        );
    }
    parsedSpec.signature = parsedSpec.signature || "";

    return {
        name: parsedSpec.name,
        signature: parsedSpec.signature,
        body: parse(parsedSpec.body).content,
    };
}
