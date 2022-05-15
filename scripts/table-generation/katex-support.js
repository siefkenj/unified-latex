/* eslint-env node */
const { parse, tools } = require("../dist/latex-parser");
const fs = require("fs");

// From https://stackoverflow.com/questions/5285995/how-do-you-sort-letters-in-javascript-with-capital-and-lowercase-letters-combin
function case_insensitive_comp(strA, strB) {
    return strA.toLowerCase().localeCompare(strB.toLowerCase());
}

// Get the supported macros/environments from katex
const katexTableSrc = fs.readFileSync("./data/katex-support-table.md", "utf8");
const katexTable = parse(katexTableSrc);
const katexMacros = new Set(tools.allMacros(katexTable).keys());
const katexEnvironments = new Set(tools.allEnvironments(katexTable).keys());
// katex supports \|, but it is not listed in the support table (it has to be markdown escaped).
// Add it manually.
katexMacros.add("|");
console.log("KaTeX supported macros/envs:", katexMacros, katexEnvironments);

const macrosList = [...katexMacros];
macrosList.sort();
const environmentsList = [...katexEnvironments];
environmentsList.sort(case_insensitive_comp);

const output = {
    KATEX_MACROS: macrosList,
    KATEX_ENVIRONMENTS: environmentsList,
};

console.log("Generated table", output);

fs.writeFileSync(
    "./generated/katex-support.json",
    JSON.stringify(output, null, 4),
    "utf8"
);
