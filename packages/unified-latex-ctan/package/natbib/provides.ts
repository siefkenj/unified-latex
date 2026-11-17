import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

// Citation keys are in text mode, even when the citation is used in math
export const macros: MacroInfoRecord = {
    citet: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citep: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citealt: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citealp: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citeauthor: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citefullauthor: { signature: "m", renderInfo: { inMathMode: false } },
    citeyear: { signature: "s o o m", renderInfo: { inMathMode: false } },
    citeyearpar: { signature: "o o m", renderInfo: { inMathMode: false } },
    citenum: { signature: "m", renderInfo: { inMathMode: false } },
    citetext: { signature: "m", renderInfo: { inMathMode: false } },
    Citet: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Citep: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Citealt: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Citealp: { signature: "s o o m", renderInfo: { inMathMode: false } },
    Citeauthor: { signature: "s o o m", renderInfo: { inMathMode: false } },
    // XXX there are more obscure commands to add here
    // https://ctan.org/pkg/natbib
};

export const environments: EnvInfoRecord = {};
