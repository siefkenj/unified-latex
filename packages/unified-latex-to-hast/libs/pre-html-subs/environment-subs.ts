import cssesc from "cssesc";
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
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { wrapPars } from "../wrap-pars";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";

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

function enumerateFactory(parentTag = "ol", className = "enumerate") {
    return function enumerateToHtml(env: Ast.Environment) {
        // The body of an enumerate has already been processed and all relevant parts have
        // been attached to \item macros as arguments.
        const items = env.content.filter((node) => match.macro(node, "item"));
        const content = items.flatMap((node) => {
            if (!match.macro(node) || !node.args) {
                return [];
            }

            const attributes: Record<string, string | Record<string, string>> =
                {};
            // Figure out if there any manually-specified item labels. If there are,
            // we need to specify a custom list-style-type.
            // We test the open mark to see if an optional argument was actually supplied.
            const namedArgs = getItemArgs(node);
            if (namedArgs.label != null) {
                const formattedLabel = cssesc(printRaw(namedArgs.label || []));
                attributes.style = {
                    // Note the space after `formattedLabel`. That is on purpose!
                    "list-style-type": formattedLabel
                        ? `'${formattedLabel} '`
                        : "none",
                };
            }

            const body = namedArgs.body;
            return htmlLike({
                tag: "li",
                content: wrapPars(body),
                attributes,
            });
        });

        return htmlLike({
            tag: parentTag,
            attributes: { className },
            content,
        });
    };
}

function createCenteredElement(env: Ast.Environment) {
    return htmlLike({
        tag: "center",
        attributes: { className: "center" },
        content: env.content,
    });
}

function createTableFromTabular(env: Ast.Environment) {
    const tabularBody = parseAlignEnvironment(env.content);
    const args = getArgsContent(env);
    let columnSpecs: TabularColumn[] = [];
    try {
        columnSpecs = parseTabularSpec(args[1] || []);
    } catch (e) {}

    const tableBody = tabularBody.map((row) => {
        const content = row.cells.map((cell, i) => {
            const columnSpec = columnSpecs[i];
            const styles: Record<string, string> = {};
            if (columnSpec) {
                const { alignment } = columnSpec;
                if (alignment.alignment === "center") {
                    styles["text-align"] = "center";
                }
                if (alignment.alignment === "right") {
                    styles["text-align"] = "right";
                }
                if (
                    columnSpec.pre_dividers.some(
                        (div) => div.type === "vert_divider"
                    )
                ) {
                    styles["border-left"] = "1px solid";
                }
                if (
                    columnSpec.post_dividers.some(
                        (div) => div.type === "vert_divider"
                    )
                ) {
                    styles["border-right"] = "1px solid";
                }
            }
            return htmlLike(
                Object.keys(styles).length > 0
                    ? {
                          tag: "td",
                          content: cell,
                          attributes: { style: styles },
                      }
                    : {
                          tag: "td",
                          content: cell,
                      }
            );
        });
        return htmlLike({ tag: "tr", content });
    });

    return htmlLike({
        tag: "table",
        content: [
            htmlLike({
                tag: "tbody",
                content: tableBody,
            }),
        ],
        attributes: { className: "tabular" },
    });
}

/**
 * Rules for replacing a macro with an html-like macro
 * that will render has html when printed.
 */
export const environmentReplacements: Record<
    string,
    (node: Ast.Environment, info: VisitInfo) => Ast.Macro | Ast.String | Ast.Environment
> = {
    enumerate: enumerateFactory("ol"),
    itemize: enumerateFactory("ul", "itemize"),
    center: createCenteredElement,
    tabular: createTableFromTabular,
    quote: (env) => {
        return htmlLike({
            tag: "blockquote",
            content: env.content,
            attributes: { className: "environment quote" },
        });
    },
};
