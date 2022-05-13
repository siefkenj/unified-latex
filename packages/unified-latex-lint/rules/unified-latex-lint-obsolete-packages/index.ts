import { lintRule } from "unified-lint-rule";
import * as Ast from "../../../unified-latex-types";
import { listPackages } from "../../../unified-latex-util-packages";

const OBSOLETE: Record<string, string> = {
    a4: "Use `geometry` or `typearea` instead",
    a4wide: "Use `geometry` or `typearea` instead",
    anysize: "Use `geometry` or `typearea` instead",
    backrefx: "Use `backref` instead",
    bitfield: "Use `bytefield` instead",
    caption2: "Use `caption` instead",
    csvtools: "Use `datatool` instead",
    dinat: "Use `natdin` instead",
    doublespace: "Use `setspace` instead",
    dropping: "Use `lettrine` instead",
    eledmac: "Use `reledmac` instead",
    eps: "Use `graphicx` instead",
    epsfig: "Use `graphicx` instead",
    euler: "Use `eulervm` instead",
    eurotex: "Use `inputenx` instead",
    fancyheadings: "Use `fancyhdr` instead",
    filecontents: "Not needed; package now included in the LaTeX kernel",
    floatfig: "Use `floatflt` instead",
    german: "Use `babel` instead",
    glossary: "Use `glossaries` instead",
    graphics: "Use `graphicxs` instead",
    here: "Use `float` instead",
    hyper: "Use `hyperref` instead",
    ifthen: "Use `etoolbox` instead",
    isolatin: "Use `inputenc` instead",
    isolatin1: "Use `inputenc` instead",
    mathpple: "Use `mathpazo` instead",
    mathptm: "Use `mathptmx` instead",
    ngerman: "Use `babel` instead",
    nthm: "Use `ntheorem` instead",
    palatino: "Use `mathpazo` instead",
    picinpar: "Use `floatflt`, `picins`, or `wrapfig` instead",
    prosper: "Use `powerdot` or `beamer` instead",
    "HA-prosper": "Use `powerdot` or `beamer` instead",
    ps4pdf: "Use `pst-pdf` instead",
    raggedr: "Use `ragged2e` instead",
    scrlettr: "Use `scrlttr2` instead",
    scrpage: "Use `scrpage2` instead",
    seminar: "Use `powerdot` or `beamer` instead",
    subfigure: "Use `subfig` or `subcaption` instead",
    t1enc: "Use `\\usepackage[T1]{fontenc}` instead",
    times: "Use `mathptmx` instead",
    ucs: "Use `inputenc` or `inputencx` with utf8 option instead",
    umlaute: "Use `inputenc` instead",
    umlaut: "Use `\\usepackage[latin1]{inputenc}` instead",
    utopia: "Use `fourier` instead",
    vmargin: "Use `geometry` or `typearea` instead",
};

type PluginOptions = unknown | undefined;

export const DESCRIPTION = `## Lint Rule

Avoid including obsolete packages. Use modern replacements. 

The following packages are considered obsolete:
${Object.entries(OBSOLETE)
    .map(([name, suggestion]) => `  * \`${name}\`: ${suggestion}`)
    .join("\n")}

### See

CTAN l2tabuen Section 1.1
https://tex.stackexchange.com/questions/3910/how-to-keep-up-with-packages-and-know-which-ones-are-obsolete
`;

export const unifiedLatexLintObsoletePackages = lintRule<
    Ast.Root,
    PluginOptions
>({ origin: "unified-latex-lint:obsolete-packages" }, (tree, file, options) => {
    for (const packageStr of listPackages(tree)) {
        const packageName = packageStr.content;
        if (packageName in OBSOLETE) {
            file.message(
                `Inclusion of obsolete package \`${packageName}\`. Suggestion: ${OBSOLETE[packageName]}.`,
                packageStr
            );
        }
    }
});
