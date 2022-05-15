import { MacroInfoRecord, EnvInfoRecord } from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    pgfkeys: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    tikzoption: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    tikzstyle: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    usetikzlibrary: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    pgfplotsset: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    pgfplotstabletypeset: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
};

export const environments: EnvInfoRecord = {
    tikzpicture: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    axis: { signature: "o", renderInfo: { pgfkeysArgs: true } },
};
