import { lintRule } from "unified-lint-rule";
import { arg, m } from "../../../unified-latex-builder";
import * as Ast from "../../../unified-latex-types";
import { extractFormattedGlue } from "../../../unified-latex-util-glue";
import { match } from "../../../unified-latex-util-match";
import { printRaw } from "../../../unified-latex-util-print-raw";
import { scan } from "../../../unified-latex-util-scan";
import { visit } from "../../../unified-latex-util-visit";

const LENGTH_MACROS = [
    "abovecaptionskip",
    "arraycolsep",
    "arrayrulewidth",
    "belowcaptionskip",
    "captionindent",
    "columnsep",
    "columnseprule",
    "doublerulsep",
    "fboxrule",
    "fboxsep",
    "itemsep",
    "itemindent",
    "labelsep",
    "labelwidth",
    "leftmargin",
    "leftmargini",
    "leftmarginii",
    "leftmarginiii",
    "leftmarginiv",
    "leftmarginv",
    "leftmarginvi",
    "lineskip",
    "linewidth",
    "listparindent",
    "marginparsep",
    "marginparwidth",
    "@mpfootins",
    "normallineskip",
    "overfullrule",
    "paperwidth",
    "paperheight",
    "parsep",
    "partopsep",
    "parskip",
    "parindent",
    "parfillskip",
    "tabbingsep",
    "tabcolsep",
];

const isLengthMacro = match.createMacroMatcher(LENGTH_MACROS);

type PluginOptions = { fix?: boolean } | undefined;

export const DESCRIPTION = `## Lint Rule

Avoid using TeX-style \`\\parskip=1em\` length assignments and instead
use LaTeX-style \`\\setlength{\\parskip}{1em}\`.

### See

CTAN l2tabuen Section 1.5
`;

export const unifiedLatexLintPreferSetlength = lintRule<
    Ast.Root,
    PluginOptions
>({ origin: "unified-latex-lint:prefer-setlength" }, (tree, file, options) => {
    visit(
        tree,
        (node, info) => {
            if (info.index == null) {
                return;
            }
            const containingArray = info.containingArray;
            if (!containingArray) {
                return;
            }
            const equalsIndex = scan(containingArray, "=", {
                startIndex: info.index + 1,
                onlySkipWhitespaceAndComments: true,
            });
            if (equalsIndex == null) {
                return;
            }

            // If we made it here, there was a length macro that was followed by an equals sign
            file.message(
                `TeX-style assignment to length \`${printRaw(
                    node
                )}\`; prefer LaTeX \`\\setlength{${printRaw(node)}}{...}\``,
                node
            );

            if (options?.fix) {
                const glue = extractFormattedGlue(
                    containingArray,
                    equalsIndex + 1
                );
                if (!glue) {
                    console.warn(
                        "Expected to find glue following `=` but couldn't"
                    );
                    return;
                }
                const numReplacements = glue.span.end - info.index + 1;
                // splice our fancy glue in!
                containingArray.splice(
                    info.index,
                    numReplacements,
                    ...[
                        m("setlength", [arg(node), arg(glue.glue)]),
                        ...glue.trailingStrings,
                    ]
                );
                return info.index + 1;
            }
        },
        { test: isLengthMacro }
    );
});
