import * as Xast from "xast";
import { x } from "xastscript";
import * as Ast from "@unified-latex/unified-latex-types";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { getEnvName, sanitizeXmlId } from "../pre-conversion-subs/utils";

/**
 * How a LaTeX display-math environment maps onto PreTeXt's `<md>`.
 *
 * PreTeXt gives `<md>` two mutually exclusive content models (see `MathDisplay`
 * in `pretext.rnc`):
 *
 *   * *single-line*: text content, an optional `@xml:id` making it a
 *     cross-reference target, and `@number`. PreTeXt renders this as
 *     `\begin{equation}`, so the content must be a single equation -- an
 *     alignment `&` or a `\\` here is a LaTeX/MathJax error.
 *   * *multi-line*: one `<mrow>` per line, with `@alignment` naming the
 *     amsmath environment to wrap them in. Each `<mrow>` is its own
 *     cross-reference target and carries its own `@number`.
 *
 * `alignment` being set is what selects the multi-line model. `numbered`
 * records whether the *unstarred* form is numbered in LaTeX; the star is
 * stripped by the caller and flips it off.
 *
 * (`<me>`, `<men>` and `<mdn>` were deprecated in favor of a bare `<md>` on
 * 2026-05-11; see `pretext-common.xsl`. Do not emit them.)
 */
type MathEnvSpec = {
    alignment?: "align" | "gather" | "alignat";
    numbered: boolean;
};

const MATH_ENV_SPECS: Record<string, MathEnvSpec> = {
    // Single-line displays.
    equation: { numbered: true },
    displaymath: { numbered: false },
    math: { numbered: false },
    // Multi-line displays.
    align: { alignment: "align", numbered: true },
    flalign: { alignment: "align", numbered: true },
    eqnarray: { alignment: "align", numbered: true },
    alignat: { alignment: "alignat", numbered: true },
    gather: { alignment: "gather", numbered: true },
    // PreTeXt has no `multline`: that environment is *one* equation whose parts
    // are flushed left and right, not several equations. `gather` keeps the
    // line breaks the author asked for and stays valid PreTeXt; the flush
    // positioning is lost.
    multline: { alignment: "gather", numbered: true },
    // Inner environments. These are only legal nested inside another display,
    // where they are printed verbatim as part of the enclosing math and never
    // reach this table. They are listed for the malformed-input case, where the
    // parser hands one back as a top-level `mathenv`.
    split: { alignment: "align", numbered: false },
    aligned: { alignment: "align", numbered: false },
    gathered: { alignment: "gather", numbered: false },
};

/** Macros that suppress the number on their own row. */
const UNNUMBER_MACROS = ["nonumber", "notag"];

/** Macros carrying prose to be set between two rows, as PreTeXt `<intertext>`. */
const INTERTEXT_MACROS = ["intertext", "shortintertext"];

/** Macros that separate one row of a multi-line display from the next. */
const ROW_SEP_MACROS = ["\\", "cr"];

/**
 * Read the mandatory argument of `macro`, which sits at `nodes[index]`.
 *
 * Math-mode macros are usually left unparsed by design -- the whole point of
 * `-to-pretext` is that math content passes through untouched -- so `\label{x}`
 * inside a display may arrive either with its argument attached (the parser
 * knows `\label`'s signature) or as a bare macro followed by a separate `group`
 * node. Handle both, and report how far to skip.
 */
function takeMacroArgument(
    nodes: Ast.Node[],
    index: number
): { content: Ast.Node[]; consumedThrough: number } {
    const macro = nodes[index] as Ast.Macro;
    if (macro.args?.length) {
        const args = getArgsContent(macro);
        return {
            content: args[args.length - 1] || [],
            consumedThrough: index,
        };
    }
    const next = nodes[index + 1];
    if (next && match.group(next)) {
        return { content: next.content, consumedThrough: index + 1 };
    }
    return { content: [], consumedThrough: index };
}

/** Render math content the way PreTeXt wants it: verbatim LaTeX, whitespace-trimmed. */
function renderMath(nodes: Ast.Node[]): string {
    return printRaw(nodes).trim();
}

/**
 * Split the body of a multi-line display into rows on `\\` (and `\cr`).
 *
 * Only *top-level* separators split. A `\\` inside `\begin{cases}...\end{cases}`
 * or inside a `{...}` group is already buried in that node's own `content`, so
 * no bracket matching is needed here -- the AST did it.
 *
 * Any `[10pt]`-style spacing argument on the `\\` is dropped: PreTeXt has no
 * per-row spacing control.
 */
function splitRows(content: Ast.Node[]): Ast.Node[][] {
    const rows: Ast.Node[][] = [[]];
    for (const node of content) {
        if (ROW_SEP_MACROS.some((name) => match.macro(node, name))) {
            rows.push([]);
        } else {
            rows[rows.length - 1].push(node);
        }
    }
    // A trailing `\\` is idiomatic and does not mean "one more, empty, row".
    return rows.filter((row) => renderMath(row) !== "");
}

/**
 * One row of a display, with the bookkeeping macros LaTeX writes inline
 * separated from the math itself. PreTeXt expresses all of these as markup
 * rather than as part of the math, so they have to come back out.
 */
type RowParts = {
    /** From a `\label`; makes the row a cross-reference target. */
    xmlId?: string;
    /** A `\nonumber`/`\notag` asked for this row to go unnumbered. */
    unnumbered: boolean;
    /** Prose from a leading `\intertext`, to be set above the row. */
    intertext?: Ast.Node[];
    /** The math itself, as verbatim LaTeX. */
    math: string;
};

function extractRowParts(nodes: Ast.Node[]): RowParts {
    const parts: RowParts = { unnumbered: false, math: "" };
    const math: Ast.Node[] = [];

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (match.macro(node, "label")) {
            const { content, consumedThrough } = takeMacroArgument(nodes, i);
            parts.xmlId = sanitizeXmlId(printRaw(content));
            i = consumedThrough;
            continue;
        }
        if (UNNUMBER_MACROS.some((name) => match.macro(node, name))) {
            parts.unnumbered = true;
            continue;
        }
        // amsmath requires `\intertext` to immediately follow a `\\`, so it can
        // only ever be at the front of a row -- anywhere else it is the
        // author's mistake, and is better left in the math verbatim than
        // silently relocated.
        if (
            INTERTEXT_MACROS.some((name) => match.macro(node, name)) &&
            renderMath(math) === ""
        ) {
            const { content, consumedThrough } = takeMacroArgument(nodes, i);
            parts.intertext = content;
            i = consumedThrough;
            continue;
        }
        math.push(node);
    }

    // Note `\tag{...}` is deliberately left in the math verbatim. PreTeXt's
    // `@tag` takes only symbolic names (`star`, `dagger`, ...), so an arbitrary
    // LaTeX tag has nowhere to go; verbatim at least renders correctly.
    parts.math = renderMath(math);
    return parts;
}

/** Build an `<mrow>`, in PreTeXt's usual attribute order. */
function buildMrow(parts: RowParts): Xast.Element {
    const attributes: Record<string, string> = {};
    if (parts.xmlId) {
        attributes["xml:id"] = parts.xmlId;
    }
    if (parts.unnumbered) {
        attributes["number"] = "no";
    }
    return x("mrow", attributes, parts.math);
}

/**
 * Pull the column count off an `alignat` body.
 *
 * `alignat` has no registered signature, so `\begin{alignat}{2}` leaves the
 * `{2}` sitting at the front of the environment's content.
 */
function takeAlignatColumns(content: Ast.Node[]): {
    columns?: string;
    content: Ast.Node[];
} {
    const firstIndex = content.findIndex((node) => !match.whitespace(node));
    const first = content[firstIndex];
    if (!first || !match.group(first)) {
        return { content };
    }
    const columns = printRaw(first.content).trim();
    if (!/^\d+$/.test(columns)) {
        return { content };
    }
    return { columns, content: content.slice(firstIndex + 1) };
}

/**
 * Convert a display-math node (`\[...\]`, `$$...$$`, or a `mathenv` such as
 * `align`) into a PreTeXt `<md>`.
 *
 * The body is emitted as verbatim LaTeX -- PreTeXt hands it to MathJax as-is --
 * so the work here is entirely structural: pick the right `<md>` content model,
 * split rows, and lift `\label`/`\nonumber`/`\intertext` out of the math and
 * into PreTeXt's markup.
 */
export function displayMathToXast(
    node: Ast.Environment | Ast.DisplayMath
): Xast.Element {
    const envName =
        node.type === "displaymath" ? "displaymath" : getEnvName(node.env);
    const starred = envName.endsWith("*");
    const spec = MATH_ENV_SPECS[
        starred ? envName.slice(0, -1) : envName
    ] ?? { numbered: false };
    const numbered = spec.numbered && !starred;

    let content = node.content;

    // A nominally single-line environment can still hold a `\\` -- `\[a \\ b\]`
    // is a perfectly ordinary two-line display. Left in the single-line model
    // that `\\` would land inside PreTeXt's `\begin{equation}` and error out, so
    // it selects the multi-line model too. No `@alignment` is set in that case:
    // the author never named one, and PreTeXt falls back to sniffing for a `&`
    // to choose between align and gather.
    const multiLine =
        Boolean(spec.alignment) ||
        content.some((child) =>
            ROW_SEP_MACROS.some((name) => match.macro(child, name))
        );

    if (!multiLine) {
        // Single-line model: a `\label` targets the whole display, so the row's
        // parts land on the `<md>` itself.
        const parts = extractRowParts(content);
        const attributes: Record<string, string> = {};
        if (parts.xmlId) {
            attributes["xml:id"] = parts.xmlId;
        }
        if (numbered && !parts.unnumbered) {
            attributes["number"] = "yes";
        }
        return x("md", attributes, parts.math);
    }

    const attributes: Record<string, string> = {};
    if (spec.alignment) {
        attributes["alignment"] = spec.alignment;
    }
    if (spec.alignment === "alignat") {
        const { columns, content: rest } = takeAlignatColumns(content);
        content = rest;
        if (columns) {
            attributes["alignat-columns"] = columns;
        }
    }
    if (numbered) {
        attributes["number"] = "yes";
    }

    const children: Xast.Element[] = [];
    for (const row of splitRows(content)) {
        const parts = extractRowParts(row);
        // The schema requires every `<intertext>` to be sandwiched between two
        // `<mrow>`s, so one on the first row has nothing to sit under; drop it
        // rather than emit something that cannot validate.
        if (parts.intertext && children.length > 0) {
            children.push(x("intertext", renderMath(parts.intertext)));
        }
        children.push(buildMrow(parts));
    }

    // The multi-line model requires at least one `<mrow>`. An empty display is
    // degenerate input; fall back to the single-line model, which permits one.
    if (children.length === 0) {
        delete attributes["alignment"];
        delete attributes["alignat-columns"];
        return x("md", attributes);
    }

    return x("md", attributes, children);
}
