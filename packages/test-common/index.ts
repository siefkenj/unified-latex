import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";
import { VFile } from "unified-lint-rule/lib";
import * as Ast from "../unified-latex-types";
import { trimRenderInfo } from "../unified-latex-util-render-info";

declare global {
    namespace jest {
        interface Matchers<R> {
            toFormatAs(obj: any, formatter: any): R;
        }
    }
}

expect.extend({
    toFormatAs(inStr, outStr, formatter) {
        if (typeof formatter !== "function") {
            throw new Error(
                "Must pass in a formatting function as the second argument when using `toFormatAs`"
            );
        }
        const formatted = formatter(inStr);

        const pass = this.equals(formatted, outStr);

        return {
            pass,
            message: () =>
                `When formatting\n\n${this.utils.EXPECTED_COLOR(
                    inStr
                )}\n\nthe output did ${
                    pass ? "" : "not"
                } format correctly\n\n${this.utils.printDiffOrStringify(
                    outStr,
                    formatted,
                    "Expected",
                    "Received",
                    false
                )}`,
        };
    },
});

/**
 * Parse a string directly into an `Ast.Node[]` array.
 */
export function strToNodes(str: string) {
    let value: string | undefined;
    let file: VFile | undefined;
    value = str;
    file = processLatexToAstViaUnified().processSync({ value });
    const root = trimRenderInfo(file.result as any) as Ast.Root;
    return root.content;
}

/**
 * Parse a string directly into an `Ast.Node[]` array but don't trim
 * any whitespace.
 */
export function strToNodesRaw(str: string) {
    let file: VFile | undefined;
    file = processLatexToAstViaUnified().processSync({ value: `{${str}}` });
    const root = trimRenderInfo(file.result as any) as Ast.Root;
    return (root.content[0] as Ast.Group).content;
}
