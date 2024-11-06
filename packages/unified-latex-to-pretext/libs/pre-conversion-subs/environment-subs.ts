import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import { getArgsContent, getNamedArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { wrapPars } from "../wrap-pars";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
import { makeWarningMessage } from "./utils";
import { createTableFromTabular } from "./create-table-from-tabular";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

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

function envFactory(
    tag: string,
    statement: boolean = false,
    warningMessage: string = "",
    attributes?: Record<string, string>
): (env: Ast.Environment, info: VisitInfo, file?: VFile) => Ast.Macro {
    return (env, info, file) => {
        // add a warning message to the file if needed
        if (warningMessage && file) {
            const message = makeWarningMessage(env, warningMessage, "env-subs");
            file.message(message, message.place, message.source);
        }

        // Wrap content of the environment in paragraph tags
        let content = wrapPars(env.content);

        // Add a statement around the contents of the environment if requested.
        if (statement) {
            content = [htmlLike({
                tag: "statement",
                content: content,
            })];
        }

        // Add a title tag if the environment has a title
        const args = getArgsContent(env);
        if (args[0]) {
            content.unshift(htmlLike({
                    tag: "title",
                    content: args[0] || []
                }));
        }

        // Put it all together
        return htmlLike({
            tag: tag,
            content: content,
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
    // TODO: add additional envs like theorem, etc.
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
    ...genEnvironmentReplacements(),
};

function genEnvironmentReplacements() {
    let reps: Record<
        string,
        (
            node: Ast.Environment,
            info: VisitInfo,
            file?: VFile
        ) => Ast.Macro | Ast.String | Ast.Environment | Ast.Node[]
    > = {};
    // First, a long list of pretext environments and their aliases.
    const envAliases: Record<
        string,
        { statement: boolean; aliases: string[] }
    > = {
        abstract: { statement: false, aliases: ["abs", "abstr"] },
        acknowledgement: { statement: false, aliases: ["ack"] },
        algorithm: { statement: true, aliases: ["algo", "alg"] },
        assumption: { statement: true, aliases: ["assu", "ass"] },
        axiom: { statement: true, aliases: ["axm"] },
        claim: { statement: true, aliases: ["cla"] },
        conjecture: { statement: true, aliases: ["con", "conj", "conjec"] },
        construction: { statement: false, aliases: [] },
        convention: { statement: false, aliases: ["conv"] },
        corollary: {
            statement: true,
            aliases: ["cor", "corr", "coro", "corol", "corss"],
        },
        definition: {
            statement: true,
            aliases: ["def", "defn", "dfn", "defi", "defin", "de"],
        },
        example: {
            statement: true,
            aliases: ["exam", "exa", "eg", "exmp", "expl", "exm"],
        },
        exercise: { statement: true, aliases: ["exer", "exers"] },
        exploration: { statement: false, aliases: [] },
        fact: { statement: true, aliases: [] },
        heuristic: { statement: true, aliases: [] },
        hypothesis: { statement: true, aliases: ["hyp"] },
        identity: { statement: true, aliases: ["idnty"] },
        insight: { statement: false, aliases: [] },
        investigation: { statement: false, aliases: [] },
        lemma: { statement: true, aliases: ["lem", "lma", "lemm", "lm"] },
        notation: {
            statement: false,
            aliases: ["no", "nota", "ntn", "nt", "notn", "notat"],
        },
        note: { statement: false, aliases: ["notes"] },
        observation: { statement: false, aliases: ["obs"] },
        principle: { statement: true, aliases: [] },
        problem: { statement: true, aliases: ["prob", "prb"] },
        project: { statement: false, aliases: [] },
        proof: { statement: false, aliases: ["pf", "prf", "demo"] },
        proposition: {
            statement: true,
            aliases: ["prop", "pro", "prp", "props"],
        },
        question: { statement: true, aliases: ["qu", "ques", "quest", "qsn"] },
        remark: {
            statement: false,
            aliases: ["rem", "rmk", "rema", "bem", "subrem"],
        },
        task: { statement: true, aliases: [] },
        theorem: {
            statement: true,
            aliases: ["thm", "theo", "theor", "thmss", "thrm"],
        },
        warning: { statement: false, aliases: ["warn", "wrn"] },
    };
    // For each environment PreTeXt has, we create entries for `environmentReplacements` using all reasonable aliases
    for (const [env, obj] of Object.entries(envAliases)) {
        reps[env] = envFactory(env, obj.statement);
        for (const alias of obj.aliases) {
            reps[alias] = envFactory(env, obj.statement);
        }
    }
    return reps;
}
