import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    author: {
        signature: "o m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    address: {
        signature: "o m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    curraddr: {
        signature: "o m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    email: {
        signature: "o m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    title: {
        signature: "o m",
        renderInfo: { breakAround: true, inParMode: true },
    },
    urladdr: {
        signature: "o m",
        renderInfo: { breakAround: true, inParMode: true },
    }
}

export const environments: EnvInfoRecord = {};
