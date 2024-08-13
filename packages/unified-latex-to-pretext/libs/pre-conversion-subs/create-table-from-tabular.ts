import * as Ast from "@unified-latex/unified-latex-types";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import {
    parseTabularSpec,
    TabularColumn,
} from "@unified-latex/unified-latex-ctan/package/tabularx";
import { parseAlignEnvironment } from "@unified-latex/unified-latex-util-align";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { trim } from "@unified-latex/unified-latex-util-trim";

type Attributes = Record<string, string | Record<string, string>>;

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

    const tableBody = tabularBody.map((row) => {
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
        return htmlLike({ tag: "row", content });
    });

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
                colAttributes["halign"] = alignment.alignment; // supports all alignments but stuff like p{'width'} (closest is @colspan in cell)
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
