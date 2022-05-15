/** We recreate several of the Prettier types because the types supplied by prettier have some errors in them... */

import type {
    Doc,
    AstPath as _AstPath,
    Options,
    ParserOptions,
    Printer,
} from "prettier";
import * as Ast from "@unified-latex/unified-latex-types";
export { Doc, Options };

// Make a non-generic `AstPath`
export type AstPath = _AstPath<Ast.Node | Ast.Argument>;

export interface PrintFunc {
    (path: AstPath, options: ParserOptions, print: (path: AstPath) => Doc): Doc;
}

export interface RecursivePrintFunc<U = any> {
    (path: U, index?: number, value?: any): Doc;
}
