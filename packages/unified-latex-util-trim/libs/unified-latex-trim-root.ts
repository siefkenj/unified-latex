import type { Plugin } from "unified";
import * as Ast from "@unified-latex/unified-latex-types";
import { trim } from "./trim";

type PluginOptions = void;

/**
 * Unified plugin to trim the whitespace from the start/end of the root element.
 */
export const unifiedLatexTrimRoot: Plugin<PluginOptions[], Ast.Root, Ast.Root> =
    function unifiedLatexTrimRoot() {
        return (tree) => {
            trim(tree.content);
        };
    };
