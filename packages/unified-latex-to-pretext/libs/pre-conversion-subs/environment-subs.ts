import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { wrapPars } from "../wrap-pars";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "unified-lint-rule/lib";
import { makeWarningMessage } from "./utils";
import { createTableFromTabular } from "./create-table-from-tabular";

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

/**
 * Remove the env environment by returning the content in env only.
 */
function removeEnv(env: Ast.Environment, info: VisitInfo, file?: VFile) {
    // add warning
    file?.message(
        makeWarningMessage(
            env,
            `Warning: There is no equivalent tag for \"${env.env}\", so the ${env.env} environment was removed.`,
            "environment-subs"
        )
    );

    return env.content;
}

/**
 * Rules for replacing a macro with an html-like macro
 * that will render has pretext when printed.
 */
export const environmentReplacements: Record<
    string,
    (
        node: Ast.Environment,
        info: VisitInfo,
        file?: VFile
    ) => Ast.Macro | Ast.String | Ast.Environment | Ast.Node[]
> = {
    enumerate: enumerateFactory("ol"),
    itemize: enumerateFactory("ul"),
    center: removeEnv,
    tabular: createTableFromTabular,
    quote: (env) => {
        return htmlLike({
            tag: "blockquote",
            content: env.content,
        });
    },
};
