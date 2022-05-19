import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { cleanEnumerateBody } from "../../utils/enumerate";

export const macros: MacroInfoRecord = {
    // Special
    "\\": { signature: "!s o" },
    _: { signature: "m", escapeToken: "" },
    "^": { signature: "m", escapeToken: "" },
    // \newcommand arg signature from https://www.texdev.net/2020/08/19/the-good-the-bad-and-the-ugly-creating-document-commands
    // List can be found in latex2e.pdf "An unofficial reference manual"
    newcommand: {
        signature: "s +m o +o +m",
        renderInfo: { breakAround: true },
    },
    renewcommand: {
        signature: "s +m o +o +m",
        renderInfo: { breakAround: true },
    },
    providecommand: {
        signature: "s +m o +o +m",
        renderInfo: { breakAround: true },
    },
    // Counters
    newcounter: {
        signature: "m o",
        renderInfo: { breakAround: true },
    },
    usecounter: {
        signature: "m",
    },
    setcounter: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    addtocounter: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    stepcounter: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    refstepcounter: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    // Lengths
    newlength: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    addtolength: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    settodepth: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    settoheight: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    settowidth: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    // Spaces
    stretch: { signature: "m" },
    hspace: { signature: "s m" },
    vspace: { signature: "s m", renderInfo: { breakAround: true } },
    vfill: { renderInfo: { breakAround: true } },
    indent: { renderInfo: { breakAround: true } },
    phantom: { signature: "m" },
    vphantom: { signature: "m" },
    hphantom: { signature: "m" },
    noindent: { renderInfo: { breakAround: true } },
    smallskip: { renderInfo: { breakAround: true } },
    medskip: { renderInfo: { breakAround: true } },
    bigskip: { renderInfo: { breakAround: true } },
    smallbreak: { renderInfo: { breakAround: true } },
    medbreak: { renderInfo: { breakAround: true } },
    bigbreak: { renderInfo: { breakAround: true } },
    newline: { renderInfo: { breakAround: true } },
    linebreak: { signature: "o", renderInfo: { breakAround: true } },
    nolinebreak: { signature: "o", renderInfo: { breakAround: true } },
    clearpage: { renderInfo: { breakAround: true } },
    cleardoublepage: { renderInfo: { breakAround: true } },
    newpage: { renderInfo: { breakAround: true } },
    enlargethispage: { signature: "s", renderInfo: { breakAround: true } },
    pagebreak: { signature: "o", renderInfo: { breakAround: true } },
    nopagebreak: { signature: "o", renderInfo: { breakAround: true } },
    // Boxes
    newsavebox: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    sbox: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    savebox: {
        signature: "m o o m",
        renderInfo: { breakAround: true },
    },
    mbox: { signature: "m" },
    makebox: { signature: "d() o o m", renderInfo: { breakAround: true } },
    fbox: { signature: "m" },
    framebox: { signature: "o o m", renderInfo: { breakAround: true } },
    frame: { signature: "m", renderInfo: { breakAround: true } },
    parbox: { signature: "o o o m m", renderInfo: { breakAround: true } },
    raisebox: { signature: "m o o m" },
    marginpar: { signature: "o m", renderInfo: { breakAround: true } },
    colorbox: { signature: "o m m", renderInfo: { breakAround: true } },
    fcolorbox: { signature: "o m m", renderInfo: { breakAround: true } },
    rotatebox: { signature: "o m m" },
    scalebox: { signature: "m o m" },
    reflectbox: { signature: "m" },
    resizebox: { signature: "s m m m" },
    // Define environments
    newenvironment: {
        signature: "s m o o m m",
        renderInfo: { breakAround: true },
    },
    renewenvironment: {
        signature: "s m o o m m",
        renderInfo: { breakAround: true },
    },
    newtheorem: {
        signature: "s m o m o",
        renderInfo: { breakAround: true },
    },
    newfont: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    // Counters
    alph: { signature: "m" },
    Alph: { signature: "m" },
    arabic: { signature: "m" },
    roman: { signature: "m" },
    Roman: { signature: "m" },
    fnsymbol: { signature: "m" },
    // Other
    documentclass: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    usepackage: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    item: { signature: "o", renderInfo: { hangingIndent: true } },
    value: { signature: "m" },
    centering: { renderInfo: { breakAround: true } },
    input: { signature: "m", renderInfo: { breakAround: true } },
    include: { signature: "m", renderInfo: { breakAround: true } },
    includeonly: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    discretionary: { signature: "m m m" },
    hyphenation: { signature: "m m m" },
    footnote: { signature: "o m", renderInfo: { inParMode: true } },
    footnotemark: { signature: "o" },
    footnotetext: { signature: "o m", renderInfo: { inParMode: true } },
    caption: {
        signature: "o m",
        renderInfo: { inParMode: true, breakAround: true },
    },
    // Math Commands
    sqrt: { signature: "o m", renderInfo: { inMathMode: true } },
    frac: { signature: "m m", renderInfo: { inMathMode: true } },
    stackrel: { signature: "m m" },
    ensuremath: { signature: "m", renderInfo: { inMathMode: true } },
    // Layout commands
    abstract: {
        signature: "m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    maketitle: { renderInfo: { breakAround: true } },
    doublespacing: { renderInfo: { breakAround: true } },
    singlespacing: { renderInfo: { breakAround: true } },
    author: {
        signature: "m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    date: { signature: "m", renderInfo: { breakAround: true } },
    thanks: {
        signature: "m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    title: {
        signature: "m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    pagenumbering: { signature: "m", renderInfo: { breakAround: true } },
    pagestyle: { signature: "m", renderInfo: { breakAround: true } },
    thispagestyle: { signature: "m", renderInfo: { breakAround: true } },
    // Colors
    definecolor: { signature: "m m m", renderInfo: { breakAround: true } },
    pagecolor: { signature: "o m", renderInfo: { breakAround: true } },
    nopagecolor: { renderInfo: { breakAround: true } },
    multicolumn: { signature: "m m m" },
    // Graphics
    includegraphics: {
        signature: "s o o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    rule: { signature: "o m m" },
    // Sectioning
    part: { signature: "s o m", renderInfo: { breakAround: true } },
    chapter: { signature: "s o m", renderInfo: { breakAround: true } },
    section: { signature: "s o m", renderInfo: { breakAround: true } },
    subsection: { signature: "s o m", renderInfo: { breakAround: true } },
    subsubsection: { signature: "s o m", renderInfo: { breakAround: true } },
    paragraph: { signature: "s o m", renderInfo: { breakAround: true } },
    subparagraph: { signature: "s o m", renderInfo: { breakAround: true } },
    appendix: { renderInfo: { breakAround: true } },
    frontmatter: { renderInfo: { breakAround: true } },
    mainmatter: { renderInfo: { breakAround: true } },
    backmatter: { renderInfo: { breakAround: true } },
    // Citing and references
    bibitem: { signature: "o m", renderInfo: { hangingIndent: true } },
    cite: { signature: "o m" },
    // Fonts
    textrm: { signature: "m", renderInfo: { inParMode: true } },
    textit: { signature: "m", renderInfo: { inParMode: true } },
    textmd: { signature: "m", renderInfo: { inParMode: true } },
    textbf: { signature: "m", renderInfo: { inParMode: true } },
    textup: { signature: "m", renderInfo: { inParMode: true } },
    textsl: { signature: "m", renderInfo: { inParMode: true } },
    textsf: { signature: "m", renderInfo: { inParMode: true } },
    textsc: { signature: "m", renderInfo: { inParMode: true } },
    texttt: { signature: "m", renderInfo: { inParMode: true } },
    emph: { signature: "m", renderInfo: { inParMode: true } },
    textnormal: { signature: "m", renderInfo: { inParMode: true } },
    uppercase: { signature: "m", renderInfo: { inParMode: true } },
    mathbf: { signature: "m" },
    mathsf: { signature: "m" },
    mathtt: { signature: "m" },
    mathit: { signature: "m" },
    mathnormal: { signature: "m" },
    mathcal: { signature: "m" },
    mathrm: { signature: "m" },
    // Other
    setlength: { signature: "m m", renderInfo: { breakAround: true } },
    ref: { signature: "s m" },
    label: { signature: "o m" }, // cleveref changes \label to have this signature
    printbibliography: { renderInfo: { breakAround: true } },
    addtocontents: { signature: "m m", renderInfo: { breakAround: true } },
    addcontentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    contentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    bibliography: { signature: "m", renderInfo: { breakAround: true } },
    bibliographystyle: { signature: "m", renderInfo: { breakAround: true } },
};

export const environments: EnvInfoRecord = {
    document: {
        processContent: (nodes) => {
            trim(nodes);
            return nodes;
        },
    },
    array: { signature: "o m", renderInfo: { alignContent: true } },
    description: { signature: "o", processContent: cleanEnumerateBody },
    enumerate: {
        signature: "o",
        processContent: cleanEnumerateBody,
        renderInfo: { pgfkeysArgs: true },
    },
    itemize: { signature: "o", processContent: cleanEnumerateBody },
    trivlist: { signature: "o", processContent: cleanEnumerateBody },
    list: { signature: "m m", processContent: cleanEnumerateBody },
    figure: { signature: "o" },
    "figure*": { signature: "o" },
    filecontents: { signature: "o m" },
    "filecontents*": { signature: "o m" },
    minipage: { signature: "o o o m" },
    picture: { signature: "r() d()" },
    tabbing: { renderInfo: { alignContent: true } },
    table: { signature: "o" },
    tabular: { signature: "o m", renderInfo: { alignContent: true } },
    "tabular*": { signature: "m o m", renderInfo: { alignContent: true } },
    thebibliography: {
        signature: "m",
        processContent: (nodes) => cleanEnumerateBody(nodes, "bibitem"),
    },
    // Math
    math: { renderInfo: { inMathMode: true } },
};
