import { MacroInfoRecord, EnvInfoRecord } from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    geometry: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
};

export const environments: EnvInfoRecord = {};
