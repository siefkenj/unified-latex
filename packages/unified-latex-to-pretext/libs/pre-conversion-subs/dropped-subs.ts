import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import { s } from "@unified-latex/unified-latex-builder";
import { makeWarningMessage } from "./utils";
import { wrapPars } from "../wrap-pars";

/**
 * Single source of truth for every macro/environment that has **no PreTeXt
 * equivalent at all** — as opposed to one that's approximated by an existing
 * tag (e.g. `\textsf` -> `<em>`, which belongs in `macroReplacements`/
 * `environmentReplacements` directly). Everything listed here is pure data,
 * so tooling (a lint rule, a coverage check against a macro database, ...)
 * can enumerate "what do we drop" with `Object.keys(...)` instead of having
 * to evaluate which helper function each entry in macro-subs.ts happens to
 * call.
 */
export type DroppedMacroBehavior =
    | { type: "discard" }
    /**
     * Keep one argument's content (as AST nodes, wrapped in a transparent
     * `group`) and drop everything else. Nested macros/markup inside still
     * get converted by the normal pipeline. Defaults to the last argument;
     * override `argIndex` when the meaningful argument isn't last (e.g.
     * beamer's `\alt{default}{other}` keeps the *first* alternative).
     */
    | { type: "keep-content"; argIndex?: number };

export interface DroppedMacroSpec {
    behavior: DroppedMacroBehavior;
    warning: string;
}

export const droppedMacros: Record<string, DroppedMacroSpec> = {
    phantom: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "phantom", an empty Ast.String was used as a replacement.`,
    },
    centering: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "centering".  Removing the macro.`,
    },
    mbox: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "mbox", the content was used as a replacement.`,
    },
    "\\": {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "\\", an empty Ast.String was used as a replacement.`,
    },
    textnormal: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "textnormal", the content was used as a replacement.`,
    },
    tiny: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "tiny", the content was used as a replacement.`,
    },
    footnotesize: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "footnotesize", the content was used as a replacement.`,
    },
    scriptsize: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "scriptsize", the content was used as a replacement.`,
    },
    normalsize: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "normalsize", the content was used as a replacement.`,
    },
    small: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "small", the content was used as a replacement.`,
    },
    large: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "large", the content was used as a replacement.`,
    },
    Large: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "Large", the content was used as a replacement.`,
    },
    huge: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "huge", the content was used as a replacement.`,
    },
    Huge: {
        behavior: { type: "keep-content" },
        warning: `Warning: There is no equivalent tag for "Huge", the content was used as a replacement.`,
    },
    // A trailing \vspace/\vfil(l) is converted into a `workspace` attribute on the
    // element it trails (see vertical-space-subs.ts); these only handle the residual
    // case of one that isn't trailing anything.
    vspace: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "vspace", an empty Ast.String was used as a replacement.`,
    },
    vskip: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "vskip", an empty Ast.String was used as a replacement.`,
    },
    vfil: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "vfil", an empty Ast.String was used as a replacement.`,
    },
    vfill: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "vfill", an empty Ast.String was used as a replacement.`,
    },
    hspace: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "hspace", an empty Ast.String was used as a replacement.`,
    },
    hfil: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "hfil", an empty Ast.String was used as a replacement.`,
    },
    hfill: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "hfill", an empty Ast.String was used as a replacement.`,
    },
    rule: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "rule", an empty Ast.String was used as a replacement.`,
    },
    hrule: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "hrule", an empty Ast.String was used as a replacement.`,
    },
    bigskip: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "bigskip", an empty Ast.String was used as a replacement.`,
    },
    medskip: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "medskip", an empty Ast.String was used as a replacement.`,
    },
    smallskip: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "smallskip", an empty Ast.String was used as a replacement.`,
    },
    pagebreak: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "pagebreak", an empty Ast.String was used as a replacement.`,
    },
    newpage: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "newpage", an empty Ast.String was used as a replacement.`,
    },
    clearpage: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "clearpage", an empty Ast.String was used as a replacement.`,
    },
    cleardoublepage: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "cleardoublepage", an empty Ast.String was used as a replacement.`,
    },
    linebreak: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "linebreak", an empty Ast.String was used as a replacement.`,
    },
    newline: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "newline", an empty Ast.String was used as a replacement.`,
    },
    textsize: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "textsize", an empty Ast.String was used as a replacement.`,
    },
    makebox: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "makebox", an empty Ast.String was used as a replacement.`,
    },
    maketitle: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "maketitle", an empty Ast.String was used as a replacement.`,
    },
    tableofcontents: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "tableofcontents", an empty Ast.String was used as a replacement.`,
    },
    listoffigures: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "listoffigures", an empty Ast.String was used as a replacement.`,
    },
    listoftables: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "listoftables", an empty Ast.String was used as a replacement.`,
    },
    bibliographystyle: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "bibliographystyle", an empty Ast.String was used as a replacement.`,
    },
    noindent: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent tag for "noindent", an empty Ast.String was used as a replacement.`,
    },
    // Beamer overlay/reveal commands. PreTeXt slides are static, so incremental
    // reveals have no equivalent: we keep the content and drop the reveal, warning
    // each time. `\pause` has no content and is simply removed.
    pause: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for beamer's "\\pause"; the overlay/reveal was dropped.`,
    },
    only: {
        behavior: { type: "keep-content", argIndex: 1 },
        warning: `Warning: There is no equivalent for beamer's "\\only"; the overlay spec was dropped and its content kept.`,
    },
    uncover: {
        behavior: { type: "keep-content", argIndex: 1 },
        warning: `Warning: There is no equivalent for beamer's "\\uncover"; the overlay spec was dropped and its content kept.`,
    },
    visible: {
        behavior: { type: "keep-content", argIndex: 1 },
        warning: `Warning: There is no equivalent for beamer's "\\visible"; the overlay spec was dropped and its content kept.`,
    },
    invisible: {
        behavior: { type: "keep-content", argIndex: 1 },
        warning: `Warning: There is no equivalent for beamer's "\\invisible"; the overlay spec was dropped and its content kept.`,
    },
    onslide: {
        behavior: { type: "keep-content", argIndex: 3 },
        warning: `Warning: There is no equivalent for beamer's "\\onslide"; the overlay spec was dropped and its content kept.`,
    },
    alt: {
        behavior: { type: "keep-content", argIndex: 1 },
        warning: `Warning: There is no equivalent for beamer's "\\alt"; only the default (first) alternative was kept.`,
    },
    temporal: {
        behavior: { type: "keep-content", argIndex: 2 },
        warning: `Warning: There is no equivalent for beamer's "\\temporal"; only the default (middle) alternative was kept.`,
    },
    thispagestyle: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for "\\thispagestyle"; the page style was dropped.`,
    },
    setlength: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for "\\setlength"; the length setting was dropped.`,
    },
    markleft: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for "\\markleft"; the mark was dropped.`,
    },
    markright: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for "\\markright"; the mark was dropped.`,
    },
    flushbottom: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for "\\flushbottom"; the page style was dropped.`,
    },
    raggedbottom: {
        behavior: { type: "discard" },
        warning: `Warning: There is no equivalent for "\\raggedbottom"; the page style was dropped.`,
    },
};

export interface DroppedEnvironmentSpec {
    warning: string;
    /**
     * Whether the environment's surviving content should have paragraphs
     * wrapped in `<p>` tags (same option/behavior as `envFactory`'s
     * `wrapContentInPars`). The dropped environment isn't replaced with a
     * tag of its own, so this doesn't happen automatically — only content
     * inside `document`/division/slide environments gets paragraph-wrapped
     * for free. Defaults to `true`.
     */
    wrapContentInPars?: boolean;
}

/**
 * Environments with no PreTeXt equivalent, dropped in favor of their content
 * (e.g. `env.content`). None are currently wired up — the next no-op
 * environment goes here rather than as a one-off in environment-subs.ts.
 */
export const droppedEnvironments: Record<string, DroppedEnvironmentSpec> = {
    minipage: {
        warning: `Warning: There is no equivalent for the "minipage" environment; the content was kept but the environment was dropped.`,
    },
    flushleft: {
        warning: `Warning: There is no equivalent for the "flushleft" environment; the content was kept but the environment was dropped.`,
    },
    flushright: {
        warning: `Warning: There is no equivalent for the "flushright" environment; the content was kept but the environment was dropped.`,
    },
    footnotesize: {
        warning: `Warning: There is no equivalent for the "footnotesize" environment; the content was kept but the environment was dropped.`,
    },
    scriptsize: {
        warning: `Warning: There is no equivalent for the "scriptsize" environment; the content was kept but the environment was dropped.`,
    },
    small: {
        warning: `Warning: There is no equivalent for the "small" environment; the content was kept but the environment was dropped.`,
    },
    large: {
        warning: `Warning: There is no equivalent for the "large" environment; the content was kept but the environment was dropped.`,
    },
    Large: {
        warning: `Warning: There is no equivalent for the "Large" environment; the content was kept but the environment was dropped.`,
    },
    huge: {
        warning: `Warning: There is no equivalent for the "huge" environment; the content was kept but the environment was dropped.`,
    },
    Huge: {
        warning: `Warning: There is no equivalent for the "Huge" environment; the content was kept but the environment was dropped.`,
    },
};

function makeDroppedMacroReplacer(
    spec: DroppedMacroSpec
): (macro: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node {
    return (macro, info, file) => {
        if (file) {
            const message = makeWarningMessage(macro, spec.warning, "macro-subs");
            file.message(message, message.place, message.source);
        }

        if (spec.behavior.type === "discard") {
            return s("");
        }

        const args = getArgsContent(macro);
        const argIndex = spec.behavior.argIndex ?? args.length - 1;
        return { type: "group", content: args[argIndex] || [] };
    };
}

/**
 * Build the `macroReplacements`-compatible entries for every macro in
 * `droppedMacros` (or a caller-supplied subset).
 */
export function generateDroppedMacroReplacements(
    specs: Record<string, DroppedMacroSpec> = droppedMacros
): Record<string, (macro: Ast.Macro, info: VisitInfo, file?: VFile) => Ast.Node> {
    return Object.fromEntries(
        Object.entries(specs).map(([name, spec]) => [
            name,
            makeDroppedMacroReplacer(spec),
        ])
    );
}

/**
 * Build the `environmentReplacements`-compatible entries for every
 * environment in `droppedEnvironments` (or a caller-supplied subset).
 */
export function generateDroppedEnvironmentReplacements(
    specs: Record<string, DroppedEnvironmentSpec> = droppedEnvironments
): Record<
    string,
    (env: Ast.Environment, info: VisitInfo, file?: VFile) => Ast.Node[]
> {
    return Object.fromEntries(
        Object.entries(specs).map(([name, spec]) => [
            name,
            (env: Ast.Environment, info: VisitInfo, file?: VFile) => {
                if (file) {
                    const message = makeWarningMessage(
                        env,
                        spec.warning,
                        "environment-subs"
                    );
                    file.message(message, message.place, message.source);
                }
                return spec.wrapContentInPars ?? true
                    ? wrapPars(env.content)
                    : env.content;
            },
        ])
    );
}
