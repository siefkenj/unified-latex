import * as Ast from "@unified-latex/unified-latex-types";
import { listPackages } from "@unified-latex/unified-latex-util-packages";
import { listNewcommands } from "@unified-latex/unified-latex-util-macros";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { Plugin } from "unified";
import { enclosingPosition } from "./enclosing-position";

/**
 * Plugin that reports statistics on the contents of LaTeX files.
 */
export const statsPlugin: Plugin<void[], Ast.Root, Ast.Root> = function () {
    return (tree, file) => {
        const packages = listPackages(tree);
        const packageNames = packages.map((s) => printRaw(s));
        if (packages.length > 0) {
            file.info(
                `Found ${
                    packages.length
                } imported packages: ${packageNames.join(", ")}`
            );
        }

        const newcommands = listNewcommands(tree);
        if (newcommands.length > 0) {
            file.info(
                `Found ${newcommands.length} defined commands: ${newcommands
                    .map((c) => `\\${c.name}`)
                    .join(", ")}`,
                enclosingPosition(newcommands.map((c) => c.definition))
            );
        }
    };
};

/**
 * Plugin that reports statistics on the contents of LaTeX files and replaces the file output with a JSON
 * representation of the statistics.
 */
export const statsJsonPlugin: Plugin<void[], Ast.Root, string> = function () {
    this.Compiler = (tree, file) => {
        file.extname = ".json";
        file.basename += "-stats";

        const packages = listPackages(tree).map((s) => printRaw(s));
        const newcommands = listNewcommands(tree).map((c) => ({
            name: c.name,
            signature: c.signature,
            body: printRaw(c.body),
            definition: printRaw(c.definition),
        }));

        return JSON.stringify({ packages, newcommands }, null, 4) + "\n";
    };
};
