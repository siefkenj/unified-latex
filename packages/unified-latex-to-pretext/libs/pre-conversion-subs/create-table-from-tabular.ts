import * as Ast from "@unified-latex/unified-latex-types";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import {
    parseTabularSpec,
    TabularColumn,
} from "@unified-latex/unified-latex-ctan/package/tabularx";
import { parseAlignEnvironment } from "@unified-latex/unified-latex-util-align";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { trim } from "@unified-latex/unified-latex-util-trim";

type Attributes = Record<string, string | Record<string, string>>;

// `\hline` is a row separator (just like `\\`), so `parseAlignEnvironment`
// reports a standalone `\hline` as its own zero-cell "row". We detect that
// case and turn it into a `bottom="minor"` border on the preceding row
// instead of emitting an empty `<row>`.
const isHline = match.createMacroMatcher(["hline"]);

/**
 * Convert env into a tabular in PreTeXt.
 */
export function createTableFromTabular(env: Ast.Environment) {
    const tabularBody = parseAlignEnvironment(env.content);
    const args = getArgsContent(env);
    let columnSpecs: TabularColumn[] = [];
    try {
        columnSpecs = parseTabularSpec(args[1] || []);
    } catch (e) {}

    // for the tabular tag
    const attributes: Attributes = {};

    // we only need the col tags if one of the columns aren't left aligned/have a border
    let notLeftAligned: boolean = false;

    // stores which columns have borders to the right
    // number is the column's index in columnSpecs
    const columnRightBorder: Record<number, boolean> = {};

    // rows that will actually be emitted as `<row>` elements. A bare `\hline`
    // (no cells) is folded into the `bottom` attribute of the row built just
    // before it, rather than becoming an empty row of its own.
    const rows: { attributes: Attributes; content: Ast.Node[] }[] = [];

    // A "row" made up entirely of whitespace (e.g. the newline/space that
    // sits between `\\` and `\hline`) still parses with a non-empty `cells`
    // array -- each whitespace token becomes its own single-node cell -- so
    // `cells.length === 0` alone isn't enough to detect a bare `\hline`.
    const isEmptyRow = (cells: Ast.Node[][]) =>
        cells.every((cell) => cell.every((node) => match.whitespace(node)));

    for (const row of tabularBody) {
        if (isEmptyRow(row.cells)) {
            if (isHline(row.rowSep)) {
                if (rows.length > 0) {
                    rows[rows.length - 1].attributes["bottom"] = "minor";
                } else {
                    // A `\hline` before any content is a rule at the top of
                    // the table.
                    attributes["top"] = "minor";
                }
            }
            continue;
        }

        const rowAttributes: Attributes = {};
        const content = row.cells.map((cell, i) => {
            const columnSpec = columnSpecs[i];

            if (columnSpec) {
                const { alignment } = columnSpec;

                // this will need to be in the tabular tag
                if (
                    columnSpec.pre_dividers.some(
                        (div) => div.type === "vert_divider"
                    )
                ) {
                    attributes["left"] = "minor";
                }

                // check if the column has a right border
                if (
                    columnSpec.post_dividers.some(
                        (div) => div.type === "vert_divider"
                    )
                ) {
                    columnRightBorder[i] = true;
                }

                // check if the default alignment isn't used
                if (alignment.alignment !== "left") {
                    notLeftAligned = true;
                }
            }

            // trim whitespace off cell
            trim(cell);

            return htmlLike({
                tag: "cell",
                content: cell,
            });
        });

        // `\hline` can also end a row directly (without a preceding `\\`).
        if (isHline(row.rowSep)) {
            rowAttributes["bottom"] = "minor";
        }

        rows.push({ attributes: rowAttributes, content });
    }

    const tableBody: Ast.Node[] = rows.map((row) =>
        htmlLike({
            tag: "row",
            content: row.content,
            attributes: row.attributes,
        })
    );

    // add col tags if needed
    if (notLeftAligned || Object.values(columnRightBorder).some((b) => b)) {
        // go backwards since adding col tags to the front of the tableBody list
        // otherwise, col tags will be in the reversed order
        for (let i = columnSpecs.length; i >= 0; i--) {
            const columnSpec = columnSpecs[i];

            if (!columnSpec) {
                continue;
            }

            const colAttributes: Attributes = {};
            const { alignment } = columnSpec;

            // add h-align attribute if not default
            if (alignment.alignment !== "left") {
                colAttributes["halign"] = alignment.alignment;
            }

            // if there is a right border add it
            if (columnRightBorder[i] === true) {
                colAttributes["right"] = "minor";
            }

            tableBody.unshift(
                htmlLike({ tag: "col", attributes: colAttributes })
            );
        }
    }

    return htmlLike({
        tag: "tabular",
        content: tableBody,
        attributes: attributes,
    });
}
