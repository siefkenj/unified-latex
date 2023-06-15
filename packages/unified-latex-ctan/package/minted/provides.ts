import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import { argumentParser } from "./libs/command-argument-parser";

export const macros: MacroInfoRecord = {
    mint: { argumentParser: argumentParser },
    mintinline: { argumentParser: argumentParser },
    inputminted: { argumentParser: argumentParser },
    usemintedstyle: { signature: "m" },
    setminted: { signature: "o m" },
    setmintedinline: { signature: "o m" },
    newmint: { signature: "o m m" },
    newminted: { signature: "o m m" },
    newmintinline: { signature: "o m m" },
    newmintedfile: { signature: "o m m" },
};

export const environments: EnvInfoRecord = {};
