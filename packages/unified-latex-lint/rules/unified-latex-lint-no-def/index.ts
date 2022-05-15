import { lintRule } from "unified-lint-rule";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";

const isDefMacro = match.createMacroMatcher(["def"]);

type PluginOptions = undefined;

export const DESCRIPTION = `## Lint Rule

Avoid using \`\\def\\macro{val}\` to define a macro. Use \`\\newcommand{\\macro}{val}\` or
\`\\NewDocumentCommand{\\macro}{}{val}\` from the \`xparse\` package.

### See

CTAN l2tabuen Section 1.7
`;

export const unifiedLatexLintNoDef = lintRule<Ast.Root, PluginOptions>(
    { origin: "unified-latex-lint:no-def" },
    (tree, file) => {
        visit(
            tree,
            (node) => {
                file.message(
                    `Do not use \`\\def\\macro{val}\` to define a macro. Use \`\\newcommand{\\macro}{val}\` or \`\\NewDocumentCommand{\\macro}{}{val}\` from the \`xparse\` package.`,
                    node
                );
            },
            { test: isDefMacro }
        );
    }
);
