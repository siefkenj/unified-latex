import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    cref: { signature: "s m", renderInfo: { inMathMode: false } },
    Cref: { signature: "s m", renderInfo: { inMathMode: false } },
    crefrange: { signature: "s m m", renderInfo: { inMathMode: false } },
    Crefrange: { signature: "s m m", renderInfo: { inMathMode: false } },
    cpageref: { signature: "s m", renderInfo: { inMathMode: false } },
    Cpageref: { signature: "s m", renderInfo: { inMathMode: false } },
    ref: { signature: "m", renderInfo: { inMathMode: false } },
    pageref: { signature: "m", renderInfo: { inMathMode: false } },
    namecref: { signature: "m", renderInfo: { inMathMode: false } },
    nameCref: { signature: "m", renderInfo: { inMathMode: false } },
    lcnamecref: { signature: "m", renderInfo: { inMathMode: false } },
    namecrefs: { signature: "m", renderInfo: { inMathMode: false } },
    nameCrefs: { signature: "m", renderInfo: { inMathMode: false } },
    lcnamecrefs: { signature: "m", renderInfo: { inMathMode: false } },
    labelcref: { signature: "m", renderInfo: { inMathMode: false } },
    labelcpageref: { signature: "m", renderInfo: { inMathMode: false } },
    crefalias: { signature: "m m" },
    crefname: { signature: "m m m" },
    // XXX there are many more obscure commands to add here
    // https://ctan.org/pkg/cleveref
    crefdefaultlabelformat: { signature: "m" },
    crefrangeconjunction: { signature: "m" },
};

export const environments: EnvInfoRecord = {};
