/* eslint-env node */
const { parse, tools, printRaw } = require("../dist/latex-parser");
const fs = require("fs");

// From https://stackoverflow.com/questions/5285995/how-do-you-sort-letters-in-javascript-with-capital-and-lowercase-letters-combin
function case_insensitive_comp(strA, strB) {
    return ("" + strA).toLowerCase().localeCompare(("" + strB).toLowerCase());
}

// Get the supported macros/environments from katex
const inputenxSrc = fs.readFileSync("./data/inputenx.dtx", "utf8");

const SPECIAL_MACROS = {
    DeclareUnicodeCharacter: { signature: "m m" },
    InputenxUC: { signature: "m m m" },
};

const inputenx = parse(inputenxSrc, { macros: SPECIAL_MACROS });
const inputenxMacros = tools.allMacros(inputenx);

// It turns out InputenxUC includes everything that DeclareUnicodeCharacter includes,
// so we don't need DeclareUnicodeCharacter
//const declaredUnicodeMacros = inputenxMacros.get("DeclareUnicodeCharacter");
const inputUCMacros = inputenxMacros.get("InputenxUC");

function normalizeMacro(nodes) {
    nodes = nodes
        .filter((node) => !tools.match.whitespace(node))
        .map((node) => {
            if (tools.match.group(node)) {
                return node.content;
            }
            return node;
        });
    return nodes.map(printRaw).join(" ");
}

const inputMacrosMap = inputUCMacros
    .map((node) => {
        const ucSeq = printRaw(node.args[0].content);
        const macro = normalizeMacro(node.args[1].content);
        return [macro, String.fromCharCode(parseInt(ucSeq, 16))];
    })
    // Any ligatures that require `@` to write we don't consider since
    // they have to be written with `\makeatletter`
    .filter((pair) => !pair[0].includes("@"))
    // We only want to extract macro-based ligatures. Things like `fi` and `fl`
    // we don't actually want to pair. We leave that up to the text renderer.
    .filter((pair) => pair[0].includes("\\"));

inputMacrosMap.sort(case_insensitive_comp);

console.log("InputenxUC", inputUCMacros);
console.log("input macros", inputMacrosMap);

fs.writeFileSync(
    "./generated/ligature-macros.json",
    JSON.stringify(inputMacrosMap, null, 4),
    "utf8"
);
