import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import {
    odArgumentParser,
    ovArgumentParser,
} from "./libs/command-argument-parser";

export const macros: MacroInfoRecord = {
    lstset: { signature: "m" },
    lstinline: { argumentParser: odArgumentParser },
    lstinputlisting: { argumentParser: ovArgumentParser },
    lstdefinestyle: { signature: "m m" },
    lstnewenvironment: { signature: "m o o m m" },
    lstMakeShortInline: { signature: "o m" },
    lstDeleteShortInline: { signature: "m" },
    lstdefineformat: { signature: "m m" },
    lstdefinelanguage: { signature: "o m o m o" },
    lstalias: { signature: "o m o m" },
    lstloadlanguages: { signature: "m" },
};

export const environments: EnvInfoRecord = {};
