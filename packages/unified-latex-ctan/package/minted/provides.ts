import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import { omdArgumentParser } from "./libs/command-argument-parser";

export const macros: MacroInfoRecord = {
    mint: { argumentParser: omdArgumentParser },
    mintinline: { argumentParser: omdArgumentParser },
    inputminted: { argumentParser: omdArgumentParser },
    usemintedstyle: { signature: "m" },
    setminted: { signature: "o m" },
    setmintedinline: { signature: "o m" },
    newmint: { signature: "o m m" },
    newminted: { signature: "o m m" },
    newmintinline: { signature: "o m m" },
    newmintedfile: { signature: "o m m" },
};

export const environments: EnvInfoRecord = {};
