import { MacroInfoRecord, EnvInfoRecord } from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {};

export const environments: EnvInfoRecord = {
    tabularx: { signature: "m o m", renderInfo: { alignContent: true } },
};
