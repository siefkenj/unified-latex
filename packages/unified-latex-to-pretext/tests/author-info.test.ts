import { describe, it, expect } from "vitest";
import Prettier from "prettier";
import util from "util";
import { unifiedLatexToPretext } from "../libs/unified-latex-plugin-to-pretext";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { convertToPretext, xmlCompilePlugin } from "../libs/convert-to-pretext";
import { Node } from "@unified-latex/unified-latex-types";
import {
    getParser,
    unifiedLatexFromString,
} from "@unified-latex/unified-latex-util-parse";
import { unified } from "unified";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

function normalizeHtml(str: string) {
    try {
        return Prettier.format(str, { parser: "html" });
    } catch {
        console.warn("Could not format HTML string", str);
        return str;
    }
}
/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-to-pretext:author-info", () => {});
