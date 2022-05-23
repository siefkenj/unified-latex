import { processLatexViaUnified } from "./libs/unified-latex";
import { unifiedArgs } from "./libs/unified-args";

unifiedArgs({
    processor: processLatexViaUnified,
    name: "unified-latex",
    description: "LaTeX processor powered by unified-latex",
    version: "1.0.8",
    extensions: ["tex"],
    ignoreName: ".unifiedlatexignore",
    packageField: "unifiedLatexConfig",
    rcName: ".unifiedlatexrc",
    pluginPrefix: "@unified-latex/",
});

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Command line interface to common `unified-latex` functions.
 *
 * ## When should I use this?
 *
 * If you want to reformat, process, or gather statistic on LaTeX files from the command line.
 *
 * ## Examples
 *
 * Reformat and pretty-print a file
 *
 * ```bash
 * unified-latex input.tex -o output.tex
 * ```
 *
 * List all commands defined via `\newcommand` and friends (and hide the file output).
 *
 * ```bash
 * unified-latex input.tex --no-stdout --stats
 * ```
 *
 * Expand the definition of the macro `\foo{...}`, which takes one argument.
 *
 * ```bash
 * unified-latex input.tex -e "\\newcommand{foo}[1]{FOO(#1)}"
 * ```
 *
 * View the parsed AST.
 *
 * ```bash
 * unified-latex input.tex --inspect
 * ```
 *
 * Convert the file to HTML. (Note, you will need to include and configure a library like _MathJax_ or _KaTeX_ to render
 * any math in the resulting HTML. Warnings are provided for macros that aren't recognized by the converter.)
 *
 * ```bash
 * unified-latex input.tex -o output.html --html
 * ```
 *
 * Lint all tex files in the current directory and watch for changes.
 *
 * ```bash
 * unified-latex . --no-stdout --lint-all --watch
 * ```
 */
