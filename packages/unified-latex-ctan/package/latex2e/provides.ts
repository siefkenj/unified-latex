import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { cleanEnumerateBody } from "../../utils/enumerate";
import { boxArgumentParser } from "./libs/box-argument-parser";

export const macros: MacroInfoRecord = {
    // Special
    "\\": { signature: "!s !o", renderInfo: { breakAfter: true } },
    _: { signature: "m", escapeToken: "" },
    "^": { signature: "m", escapeToken: "" },
    // \newcommand arg signature from https://www.texdev.net/2020/08/19/the-good-the-bad-and-the-ugly-creating-document-commands
    // List can be found in latex2e.pdf "An unofficial reference manual"
    newcommand: {
        signature: "s +m o +o +m",
        renderInfo: {
            breakAround: true,
            namedArguments: ["starred", "name", "numArgs", "default", "body"],
        },
    },
    renewcommand: {
        signature: "s +m o +o +m",
        renderInfo: {
            breakAround: true,
            namedArguments: ["starred", "name", "numArgs", "default", "body"],
        },
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
    hspace: { signature: "s m", renderInfo: { inMathMode: false } },
    vspace: {
        signature: "s m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
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
        renderInfo: { breakAround: true, inMathMode: false },
    },
    sbox: {
        signature: "m m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    savebox: {
        signature: "m o o m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    // TeX primitives. Their arguments are a box specification (e.g. `to 1in`) and their content.
    hbox: {
        argumentParser: boxArgumentParser,
        renderInfo: { inMathMode: false },
    },
    vbox: {
        argumentParser: boxArgumentParser,
        renderInfo: { inMathMode: false },
    },
    vtop: {
        argumentParser: boxArgumentParser,
        renderInfo: { inMathMode: false },
    },
    mbox: { signature: "m", renderInfo: { inMathMode: false } },
    makebox: {
        signature: "d() o o m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    fbox: { signature: "m", renderInfo: { inMathMode: false } },
    framebox: {
        signature: "o o m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    frame: { signature: "m", renderInfo: { breakAround: true } },
    parbox: {
        signature: "o o o m m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    raisebox: { signature: "m o o m", renderInfo: { inMathMode: false } },
    marginpar: { signature: "o m", renderInfo: { breakAround: true } },
    colorbox: {
        signature: "o m m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    fcolorbox: {
        signature: "o m m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    rotatebox: { signature: "o m m", renderInfo: { inMathMode: false } },
    scalebox: { signature: "m o m", renderInfo: { inMathMode: false } },
    reflectbox: { signature: "m", renderInfo: { inMathMode: false } },
    resizebox: { signature: "s m m m", renderInfo: { inMathMode: false } },
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
    item: {
        signature: "o",
        renderInfo: { hangingIndent: true, namedArguments: ["label"] },
    },
    value: { signature: "m" },
    centering: { renderInfo: { breakAround: true } },
    input: {
        signature: "m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    include: {
        signature: "m",
        renderInfo: { breakAround: true, inMathMode: false },
    },
    includeonly: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    discretionary: { signature: "m m m" },
    hyphenation: { signature: "m" },
    footnote: { signature: "o m", renderInfo: { inParMode: true } },
    footnotemark: { signature: "o" },
    footnotetext: { signature: "o m", renderInfo: { inParMode: true } },
    caption: {
        signature: "o m",
        renderInfo: {
            inParMode: true,
            breakAround: true,
            namedArguments: ["short", "captionText"],
        },
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
    date: { signature: "o m", renderInfo: { breakAround: true } },
    thanks: {
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
        renderInfo: {
            breakAround: true,
            pgfkeysArgs: true,
            inMathMode: false,
        },
    },
    rule: { signature: "o m m" },
    // Sectioning
    part: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    chapter: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    section: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    subsection: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    subsubsection: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    paragraph: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    subparagraph: {
        signature: "s o m",
        renderInfo: {
            breakAround: true,
            inParMode: true,
            namedArguments: ["starred", "tocTitle", "title"],
        },
    },
    appendix: { renderInfo: { breakAround: true, inParMode: true } },
    frontmatter: { renderInfo: { breakAround: true, inParMode: true } },
    mainmatter: { renderInfo: { breakAround: true, inParMode: true } },
    backmatter: { renderInfo: { breakAround: true, inParMode: true } },
    // Citing and references
    bibitem: { signature: "o m", renderInfo: { hangingIndent: true } },
    cite: { signature: "o m", renderInfo: { inMathMode: false } },
    // Fonts
    textrm: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textit: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textmd: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textbf: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textup: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textsl: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textsf: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textsc: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    texttt: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    underline: { signature: "m", renderInfo: { inParMode: true } },
    emph: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textnormal: {
        signature: "m",
        renderInfo: { inParMode: true, inMathMode: false },
    },
    textsuperscript: { signature: "m", renderInfo: { inMathMode: false } },
    textsubscript: { signature: "m", renderInfo: { inMathMode: false } },
    uppercase: { signature: "m", renderInfo: { inParMode: true } },
    mathbf: { signature: "m" },
    mathsf: { signature: "m" },
    mathtt: { signature: "m" },
    mathit: { signature: "m" },
    mathnormal: { signature: "m" },
    mathcal: { signature: "m" },
    mathrm: { signature: "m" },
    // Takes a single math field, like the math accents below
    mathop: { signature: "m" },
    // Math accents (\DeclareMathAccent in fontdef.dtx -> fontmath.ltx):
    // each takes a single math field, i.e. one token or one group. The
    // field is the whole next token, so if `\xxx` is defined as
    // `\mathcal{C}`, then `\dot\xxx` expands to `\dot{\mathcal{C}}` and
    // not `\dot{\mathcal}{C}`.
    dot: { signature: "m" },
    ddot: { signature: "m" },
    hat: { signature: "m" },
    tilde: { signature: "m" },
    bar: { signature: "m" },
    vec: { signature: "m" },
    check: { signature: "m" },
    breve: { signature: "m" },
    acute: { signature: "m" },
    grave: { signature: "m" },
    mathring: { signature: "m" },
    widehat: { signature: "m" },
    widetilde: { signature: "m" },
    // \overline is a TeX primitive rather than a \DeclareMathAccent, but
    // takes the same single math field.
    overline: { signature: "m" },
    // Kernel higher-order helpers that take control sequences or branch
    // texts as arguments (latex.ltx).
    mathpalette: { signature: "m m" },
    "@ifstar": { signature: "m m" },
    "@ifnextchar": { signature: "m m m" },
    "@ifundefined": { signature: "m m m" },
    "@firstoftwo": { signature: "m m" },
    "@secondoftwo": { signature: "m m" },
    DeclareMathAlphabet: {
        signature: "m m m m m",
        renderInfo: { breakAround: true },
    },
    // Other
    setlength: { signature: "m m", renderInfo: { breakAround: true } },
    ref: { signature: "s m", renderInfo: { inMathMode: false } },
    label: { signature: "o m", renderInfo: { inMathMode: false } }, // cleveref changes \label to have this signature
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
    eqnarray: { renderInfo: { inMathMode: true, alignContent: true } },
    "eqnarray*": { renderInfo: { inMathMode: true, alignContent: true } },
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
    minipage: { signature: "o o o m", renderInfo: { inMathMode: false } },
    picture: { signature: "r() d()", renderInfo: { inMathMode: false } },
    tabbing: { renderInfo: { alignContent: true, inMathMode: false } },
    table: { signature: "o" },
    tabular: {
        signature: "o m",
        renderInfo: { alignContent: true, inMathMode: false },
    },
    "tabular*": {
        signature: "m o m",
        renderInfo: { alignContent: true, inMathMode: false },
    },
    thebibliography: {
        signature: "m",
        processContent: (nodes) => cleanEnumerateBody(nodes, "bibitem"),
    },
    // Math
    math: { renderInfo: { inMathMode: true } },
};
