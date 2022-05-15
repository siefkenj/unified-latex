import { MacroInfoRecord, EnvInfoRecord } from "@unified-latex/unified-latex-types";

export const macros: MacroInfoRecord = {
    substitutecolormodel: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    selectcolormodel: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    definecolor: {
        signature: "o m m m",
        renderInfo: { breakAround: true },
    },
    providecolor: {
        signature: "o m m m",
        renderInfo: { breakAround: true },
    },
    colorlet: {
        signature: "o m o m",
        renderInfo: { breakAround: true },
    },
    definecolorset: {
        signature: "o m m m",
        renderInfo: { breakAround: true },
    },
    providecolorset: {
        signature: "o m m m m",
        renderInfo: { breakAround: true },
    },
    preparecolor: {
        signature: "o m m m",
        renderInfo: { breakAround: true },
    },
    preparecolorset: {
        signature: "o m m m m",
        renderInfo: { breakAround: true },
    },
    DefineNamedColor: {
        signature: "m m m m",
        renderInfo: { breakAround: true },
    },
    definecolors: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    providecolors: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    color: { signature: "o m", renderInfo: { breakAround: true } },
    textcolor: { signature: "o m m", renderInfo: { inParMode: true } },
    pagecolor: { signature: "o m" },
    colorbox: { signature: "o m m" },
    fcolorbox: { signature: "o m o m m" },
    boxframe: { signature: "o m" },
    testcolor: { signature: "o m" },
    blendcolors: { signature: "s m" },
    maskcolors: { signature: "o m" },
    definecolorseries: {
        signature: "m m m o m o m",
        renderInfo: { breakAround: true },
    },
    resetcolorseries: {
        signature: "o m",
        renderInfo: { breakAround: true },
    },
    rowcolors: { signature: "s o m m m" },
    extractcolorspec: { signature: "m m" },
    extractcolorspecs: { signature: "m m m" },
    convertcolorspec: { signature: "m m m m" },
};

export const environments: EnvInfoRecord = {
    testcolors: { signature: "o", renderInfo: { pgfkeysArgs: true } },
};
