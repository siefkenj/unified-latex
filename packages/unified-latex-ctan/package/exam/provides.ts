import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import { cleanEnumerateBody } from "../../utils/enumerate";

export const macros: MacroInfoRecord = {
    answerline: { signature: "o" },
    fillin: { signature: "o o" },
    fullwidth: { signature: "m" },
    fillwidthlines: { signature: "m" },
    fillwidthdottedlines: { signature: "m" },
    fillwidthgrid: { signature: "m" },
    makeemptybox: { signature: "m" },
    CorrectChoiceEmphasis: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    SolutionEmphasis: { signature: "m", renderInfo: { breakAround: true } },
    uplevel: { signature: "m", renderInfo: { breakAround: true } },
    checkboxchar: { signature: "m", renderInfo: { breakAround: true } },
    checkedchar: { signature: "m", renderInfo: { breakAround: true } },
    pointname: { signature: "m", renderInfo: { breakAround: true } },
    marginpointname: { signature: "m", renderInfo: { breakAround: true } },
    extrawidth: { signature: "m", renderInfo: { breakAround: true } },
    pointformat: { signature: "m", renderInfo: { breakAround: true } },
    bonuspointformat: { signature: "m", renderInfo: { breakAround: true } },
    totalformat: { signature: "m", renderInfo: { breakAround: true } },
    qformat: { signature: "m", renderInfo: { breakAround: true } },
    titledquestion: { signature: "m o", renderInfo: { breakAround: true } },
    pointpoints: { signature: "m m", renderInfo: { breakAround: true } },
    bonuspointpoints: { signature: "m m", renderInfo: { breakAround: true } },
};

export const environments: EnvInfoRecord = {
    choices: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "choice"),
    },
    checkboxes: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "choice"),
    },
    oneparchoices: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "choice"),
    },
    oneparcheckboxes: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "choice"),
    },
    parts: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "part"),
    },
    subparts: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "subpart"),
    },
    subsubparts: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "subsubpart"),
    },
    questions: {
        signature: "o",
        processContent: (nodes) => cleanEnumerateBody(nodes, "question"),
    },
};
