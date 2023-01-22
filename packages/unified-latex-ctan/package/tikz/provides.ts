import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";

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
    tikz: {
        signature: "o m",
    },
    // Macros used inside the tikz environment
    path: { signature: "u;", renderInfo: { breakAround: true } },
    draw: { signature: "u;", renderInfo: { breakAround: true } },
    fill: { signature: "u;", renderInfo: { breakAround: true } },
    filldraw: { signature: "u;", renderInfo: { breakAround: true } },
    pattern: { signature: "u;", renderInfo: { breakAround: true } },
    shade: { signature: "u;", renderInfo: { breakAround: true } },
    clip: { signature: "u;", renderInfo: { breakAround: true } },
    useasboundingbox: { signature: "u;", renderInfo: { breakAround: true } },
    node: { signature: "u;", renderInfo: { breakAround: true } },
    coordinate: { signature: "u;", renderInfo: { breakAround: true } },
    graph: { signature: "u;", renderInfo: { breakAround: true } },
    scoped: { signature: "u;", renderInfo: { breakAround: true } },
    foreach: { signature: "u;", renderInfo: { breakAround: true } },
};

export const environments: EnvInfoRecord = {
    tikzpicture: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    axis: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    scope: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    colormixin: { signature: "m", renderInfo: { pgfkeysArgs: true } },
};
