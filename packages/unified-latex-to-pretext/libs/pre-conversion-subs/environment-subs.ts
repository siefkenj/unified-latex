import {
    parseTabularSpec,
    TabularColumn,
} from "@unified-latex/unified-latex-ctan/package/tabularx";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { parseAlignEnvironment } from "@unified-latex/unified-latex-util-align";
import {
    getArgsContent,
    getNamedArgsContent,
} from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { wrapPars } from "../wrap-pars";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { VFile } from "vfile";
import { emptyStringWithWarning } from "./utils";

const ITEM_ARG_NAMES_REG = ["label"] as const;
const ITEM_ARG_NAMES_BEAMER = [null, "label", null] as const;
type ItemArgs = Record<
    (typeof ITEM_ARG_NAMES_REG)[number],
    Ast.Node[] | null
> & {
    body: Ast.Node[];
};

/**
 * Extract the arguments to an `\item` macro.
 */
function getItemArgs(node: Ast.Macro): ItemArgs {
    if (!Array.isArray(node.args)) {
        throw new Error(
            `Cannot find \\item macros arguments; you must attach the \\item body to the macro before calling this function ${JSON.stringify(
                node
            )}`
        );
    }
    // The "body" has been added as a last argument to the `\item` node. We
    // ignore this argument when comparing argument signatures.
    const argNames =
        node.args.length - 1 === ITEM_ARG_NAMES_BEAMER.length
            ? ITEM_ARG_NAMES_BEAMER
            : ITEM_ARG_NAMES_REG;
    const ret = Object.assign(
        { body: node.args[node.args.length - 1].content },
        getNamedArgsContent(node, argNames)
    );
    return ret as ItemArgs;
}

function enumerateFactory(parentTag = "ol") {
    return function enumerateToHtml(env: Ast.Environment) {
        // The body of an enumerate has already been processed and all relevant parts have
        // been attached to \item macros as arguments.
        const items = env.content.filter((node) => match.macro(node, "item"));

        // Figure out if there any manually-specified item labels. If there are,
        // we need to add a title tag
        let isDescriptionList = false;

        const content = items.flatMap((node) => {
            if (!match.macro(node) || !node.args) {
                return [];
            }

            // We test the open mark to see if an optional argument was actually supplied.
            const namedArgs = getItemArgs(node);

            // if there are custom markers, don't want the title tag to be wrapped in pars
            // so we wrap the body first
            namedArgs.body = wrapPars(namedArgs.body);

            // check if a custom marker is used
            if (namedArgs.label != null) {
                isDescriptionList = true;

                // add title tag containing custom marker
                namedArgs.body.unshift(
                    htmlLike({
                        tag: "title",
                        content: namedArgs.label,
                    })
                );
            }

            const body = namedArgs.body;

            return htmlLike({
                tag: "li",
                content: body,
            });
        });

        return htmlLike({
            tag: isDescriptionList ? "dl" : parentTag,
            content,
        });
    };
}

function createTableFromTabular(env: Ast.Environment) {
    const tabularBody = parseAlignEnvironment(env.content);
    const args = getArgsContent(env);
    let columnSpecs: TabularColumn[] = [];
    try {
        columnSpecs = parseTabularSpec(args[1] || []);
    } catch (e) {}

    // for the tabular tag
    const attributes: Record<string, string | Record<string, string>> = {};

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

            const colAttributes: Record<
                string,
                string | Record<string, string>
            > = {};
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

/**
 * Rules for replacing a macro with an html-like macro
 * that will render has html when printed.
 */
export const environmentReplacements: Record<
    string,
    (
        node: Ast.Environment,
        info: VisitInfo,
        file?: VFile
    ) => Ast.Macro | Ast.String | Ast.Environment
> = {
    enumerate: enumerateFactory("ol"),
    itemize: enumerateFactory("ul"),
    center: emptyStringWithWarning(
        `Warning: There is no equivalent tag for \"center\", an empty Ast.String was used as a replacement.`,
        "environment-subs"
    ),
    tabular: createTableFromTabular,
    quote: (env) => {
        return htmlLike({
            tag: "blockquote",
            content: env.content,
        });
    },
};
