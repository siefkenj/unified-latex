import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import { commandArgumentParser } from "./libs/command-argument-parser";

export const macros: MacroInfoRecord = {
    lstset: { signature: "m" },
    lstinline: { argumentParser: commandArgumentParser },
};

export const environments: EnvInfoRecord = {
};
