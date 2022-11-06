import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    columnbreak: { renderInfo: { breakAround: true } },
};

export const environments: EnvInfoRecord = {
    multicols: {
        signature: "m o o",
    },
    "multicols*": {
        signature: "m o o",
    },
};
