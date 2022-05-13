import { MacroInfoRecord, EnvInfoRecord } from "../../../unified-latex-types";

export const macros: MacroInfoRecord = {
    cref: { signature: "s m" },
    Cref: { signature: "s m" },
    crefrange: { signature: "s m m" },
    Crefrange: { signature: "s m m" },
    cpageref: { signature: "s m" },
    Cpageref: { signature: "s m" },
    ref: { signature: "m" },
    pageref: { signature: "m" },
    namecref: { signature: "m" },
    nameCref: { signature: "m" },
    lcnamecref: { signature: "m" },
    namecrefs: { signature: "m" },
    nameCrefs: { signature: "m" },
    lcnamecrefs: { signature: "m" },
    labelcref: { signature: "m" },
    labelcpageref: { signature: "m" },
    crefalias: { signature: "m m" },
    crefname: { signature: "m m m" },
    // XXX there are many more obscure commands to add here
    // https://ctan.org/pkg/cleveref
    crefdefaultlabelformat: { signature: "m" },
    crefrangeconjunction: { signature: "m" },
};

export const environments: EnvInfoRecord = {};
