import * as cleveref from "./package/cleveref";
import * as exam from "./package/exam";
import * as geometry from "./package/geometry";
import * as hyperref from "./package/hyperref";
import * as latex2e from "./package/latex2e";
import * as makeidx from "./package/makeidx";
import * as mathtools from "./package/mathtools";
import * as nicematrix from "./package/nicematrix";
import * as systeme from "./package/systeme";
import * as tikz from "./package/tikz";
import * as xcolor from "./package/xcolor";
import * as xparse from "./package/xparse";

/**
 * Info about the macros for available ctan packages. `latex2e` contains
 * the standard macros for LaTeX.
 */
export const macroInfo = {
    cleveref: cleveref.macros,
    exam: exam.macros,
    geometry: geometry.macros,
    hyperref: hyperref.macros,
    latex2e: latex2e.macros,
    makeidx: makeidx.macros,
    mathtools: mathtools.macros,
    nicematrix: nicematrix.macros,
    systeme: systeme.macros,
    tikz: tikz.macros,
    xcolor: xcolor.macros,
    xparse: xparse.macros,
};

/**
 * Info about the environments for available ctan packages. `latex2e` contains
 * the standard environments for LaTeX.
 */
export const environmentInfo = {
    cleveref: cleveref.environments,
    exam: exam.environments,
    geometry: geometry.environments,
    hyperref: hyperref.environments,
    latex2e: latex2e.environments,
    makeidx: makeidx.environments,
    mathtools: mathtools.environments,
    nicematrix: nicematrix.environments,
    systeme: systeme.environments,
    tikz: tikz.environments,
    xcolor: xcolor.environments,
    xparse: xparse.environments,
};

// NOTE: The docstring comment must be the last item in the index.ts file!
/**
 * ## What is this?
 *
 * Macro/environment definitions and utilities for specific LaTeX packages from CTAN.
 *
 * Note: basic LaTeX macro/environment definitions come from the `latex2e` package, even though
 * this is technically not a CTAN "package".
 *
 * ## When should I use this?
 *
 * If you want information about special functions/macros from particular CTAN packages, or
 * you need to parse special environments.
 */
