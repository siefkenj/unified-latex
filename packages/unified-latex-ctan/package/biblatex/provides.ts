import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

// Citation keys are in text mode, even when the citation is used in math
export const macros: MacroInfoRecord = {
    Cite: { signature: "s o o m", renderInfo: { inMathMode: false } },
    parencite: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Parencite: { signature: "s o o m", renderInfo: { inMathMode: false } },
    footcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    footcitetext: { signature: "o o m", renderInfo: { inMathMode: false } },
    textcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    Textcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    smartcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    Smartcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    autocite: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Autocite: { signature: "s o o m", renderInfo: { inMathMode: false } },
    supercite: { signature: "m", renderInfo: { inMathMode: false } },
    citeauthor: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Citeauthor: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citetitle: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citeyear: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citedate: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citeurl: { signature: "o o m", renderInfo: { inMathMode: false } },
    fullcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    footfullcite: { signature: "o o m", renderInfo: { inMathMode: false } },
    nocite: { signature: "m", renderInfo: { inMathMode: false } },
    // XXX there are more obscure commands to add here (e.g. the multicite commands like `\cites`)
    // https://ctan.org/pkg/biblatex
};

export const environments: EnvInfoRecord = {};
