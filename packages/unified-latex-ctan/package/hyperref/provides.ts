import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    hypersetup: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    href: {
        signature: "o m m",
        renderInfo: { argumentsInMathMode: [false, false, null] },
    },
    url: { signature: "m", renderInfo: { inMathMode: false } },
    nolinkurl: { signature: "m", renderInfo: { inMathMode: false } },
    hyperbaseurl: { signature: "m" },
    hyperimage: { signature: "m m" },
    hyperdef: { signature: "m m m" },
    hyperref: {
        signature: "o m",
        renderInfo: { argumentsInMathMode: [false, null] },
    },
    hyperlink: {
        signature: "m m",
        renderInfo: { argumentsInMathMode: [false, null] },
    },
    hypertarget: {
        signature: "m m",
        renderInfo: { argumentsInMathMode: [false, null] },
    },
    autoref: { signature: "s m", renderInfo: { inMathMode: false } },
    pageref: { signature: "s m", renderInfo: { inMathMode: false } },
    autopageref: { signature: "s m", renderInfo: { inMathMode: false } },
    nameref: { signature: "s m", renderInfo: { inMathMode: false } },
    Nameref: { signature: "s m", renderInfo: { inMathMode: false } },
    pdfstringdef: { signature: "m m" },
    pdfbookmark: { signature: "o m m" },
    currentpdfbookmark: { signature: "m m" },
    subpdfbookmark: { signature: "m m" },
    belowpdfbookmark: { signature: "m m" },
    texorpdfstring: { signature: "m m" },
    thispdfpagelabel: { signature: "m" },
    hypercalcbp: { signature: "m" },
};

export const environments: EnvInfoRecord = {};
