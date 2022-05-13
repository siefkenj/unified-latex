import { unifiedLatexLintArgumentColorCommands } from "./rules/unified-latex-lint-argument-color-commands";
import { unifiedLatexLintArgumentFontShapingCommands } from "./rules/unified-latex-lint-argument-font-shaping-commands";
import { unifiedLatexLintConsistentInlineMath } from "./rules/unified-latex-lint-consistent-inline-math";
import { unifiedLatexLintNoDef } from "./rules/unified-latex-lint-no-def";
import { unifiedLatexLintNoPlaintextOperators } from "./rules/unified-latex-lint-no-plaintext-operators";
import { unifiedLatexLintNoTexDisplayMath } from "./rules/unified-latex-lint-no-tex-display-math";
import { unifiedLatexLintNoTexFontShapingCommands } from "./rules/unified-latex-lint-no-tex-font-shaping-commands";
import { unifiedLatexLintObsoletePackages } from "./rules/unified-latex-lint-obsolete-packages";
import { unifiedLatexLintPreferSetlength } from "./rules/unified-latex-lint-prefer-setlength";

/**
 * Object exporting all available lints.
 */
export const lints = {
    unifiedLatexLintArgumentColorCommands,
    unifiedLatexLintArgumentFontShapingCommands,
    unifiedLatexLintConsistentInlineMath,
    unifiedLatexLintNoDef,
    unifiedLatexLintNoPlaintextOperators,
    unifiedLatexLintNoTexDisplayMath,
    unifiedLatexLintNoTexFontShapingCommands,
    unifiedLatexLintObsoletePackages,
    unifiedLatexLintPreferSetlength,
};

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Linting functions for `unified-latex` ASTs. Lints are found in the `rules/` subdirectory. Lints
 * that can be fixed accept an optional `{fix: boolean}` argument.
 *
 * ## When should I use this?
 *
 * If you are building a linter for LaTeX code.
 *
 */
