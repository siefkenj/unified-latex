import type { Doc } from "prettier";
import * as PrettierTypes from "./prettier-types";

import { hardline, line, ESCAPE, getNodeInfo } from "./common";
import { printMacro } from "./macro";
import { printArgument } from "./argument";
import { printRoot } from "./root";
import { printComment } from "./comment";
import { printInlineMath, printDisplayMath } from "./math";
import {
    printVerbatimEnvironment,
    printEnvironment,
    printAlignedEnvironment,
} from "./environment";
import {
    linebreak,
    printRaw,
} from "@unified-latex/unified-latex-util-print-raw";
import { ReferenceMap } from "../reference-map";

export function printLatexAst(
    path: PrettierTypes.AstPath,
    options: PrettierTypes.Options & { referenceMap?: ReferenceMap },
    print: PrettierTypes.RecursivePrintFunc
): Doc {
    const node = path.getValue();
    const { renderInfo } = getNodeInfo(node, options);

    if (node == null) {
        return node;
    }
    if (typeof node === "string") {
        return node;
    }

    switch (node.type) {
        case "root":
            // Create the ReferenceMap from the root node, so that
            // it can traverse the entire AST
            if (options.referenceMap) {
                console.warn(
                    "Processing root node, but ReferenceMap already exists. Are there multiple nodes of type 'root'?"
                );
            }
            options.referenceMap = new ReferenceMap(node);
            return printRoot(path, print, options);
        case "argument":
            return printArgument(path, print, options);
        case "comment":
            return printComment(path, print, options);
        case "environment":
        case "mathenv":
            if (renderInfo.alignContent) {
                return printAlignedEnvironment(path, print, options);
            }
            return printEnvironment(path, print, options);
        case "displaymath":
            return printDisplayMath(path, print, options);
        case "group":
            // When we print a group, we are conservative and do a raw print of its contents.
            // However, we want to use `linebreak`s instead of literal `\n` tokens.
            const content = printRaw(node.content, {
                asArray: true,
            }).map((token) => (token === linebreak ? hardline : token));
            return ["{", ...content, "}"];
        case "inlinemath":
            return printInlineMath(path, print, options);
        case "macro":
            return printMacro(path, print, options);
        case "parbreak":
            return [hardline, hardline];
        case "string":
            return node.content;
        case "verb":
            return [
                ESCAPE,
                node.env,
                node.escape,
                printRaw(node.content),
                node.escape,
            ];
        case "verbatim":
            return printVerbatimEnvironment(path, print, options);
        case "whitespace":
            return line;
        default:
            console.warn("Printing unknown type", node);
            return printRaw(node);
    }
}
