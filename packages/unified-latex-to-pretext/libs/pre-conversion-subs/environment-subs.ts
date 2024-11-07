import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    getArgsContent,
    getNamedArgsContent,
} from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { wrapPars } from "../wrap-pars";
import { VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { VFile } from "vfile";
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
 * Factory function that builds html-like macros wrapping the contents of an environment.
 * Statement tags are added around the contents of the environment if requested.
 */
function envFactory(
    tag: string,
    requiresStatementTag: boolean = false,
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
        if (requiresStatementTag) {
            content = [
                htmlLike({
                    tag: "statement",
                    content: content,
                }),
            ];
        }

        // Add a title tag if the environment has a title
        const args = getArgsContent(env);
        if (args[0]) {
            content.unshift(
                htmlLike({
                    tag: "title",
                    content: args[0] || [],
                })
            );
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
    ) => Ast.Node | Ast.Node[]
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
        (node: Ast.Environment, info: VisitInfo, file?: VFile) => Ast.Node
    > = {};
    // First, a long list of pretext environments and their aliases.
    const envAliases: Record<
        string,
        { requiresStatment: boolean; aliases: string[] }
    > = {
        abstract: { requiresStatment: false, aliases: ["abs", "abstr"] },
        acknowledgement: { requiresStatment: false, aliases: ["ack"] },
        algorithm: { requiresStatment: true, aliases: ["algo", "alg"] },
        assumption: { requiresStatment: true, aliases: ["assu", "ass"] },
        axiom: { requiresStatment: true, aliases: ["axm"] },
        claim: { requiresStatment: true, aliases: ["cla"] },
        conjecture: {
            requiresStatment: true,
            aliases: ["con", "conj", "conjec"],
        },
        construction: { requiresStatment: false, aliases: [] },
        convention: { requiresStatment: false, aliases: ["conv"] },
        corollary: {
            requiresStatment: true,
            aliases: ["cor", "corr", "coro", "corol", "corss"],
        },
        definition: {
            requiresStatment: true,
            aliases: ["def", "defn", "dfn", "defi", "defin", "de"],
        },
        example: {
            requiresStatment: true,
            aliases: ["exam", "exa", "eg", "exmp", "expl", "exm"],
        },
        exercise: { requiresStatment: true, aliases: ["exer", "exers"] },
        exploration: { requiresStatment: false, aliases: [] },
        fact: { requiresStatment: true, aliases: [] },
        heuristic: { requiresStatment: true, aliases: [] },
        hypothesis: { requiresStatment: true, aliases: ["hyp"] },
        identity: { requiresStatment: true, aliases: ["idnty"] },
        insight: { requiresStatment: false, aliases: [] },
        investigation: { requiresStatment: false, aliases: [] },
        lemma: {
            requiresStatment: true,
            aliases: ["lem", "lma", "lemm", "lm"],
        },
        notation: {
            requiresStatment: false,
            aliases: ["no", "nota", "ntn", "nt", "notn", "notat"],
        },
        note: { requiresStatment: false, aliases: ["notes"] },
        observation: { requiresStatment: false, aliases: ["obs"] },
        principle: { requiresStatment: true, aliases: [] },
        problem: { requiresStatment: true, aliases: ["prob", "prb"] },
        project: { requiresStatment: false, aliases: [] },
        proof: { requiresStatment: false, aliases: ["pf", "prf", "demo"] },
        proposition: {
            requiresStatment: true,
            aliases: ["prop", "pro", "prp", "props"],
        },
        question: {
            requiresStatment: true,
            aliases: ["qu", "ques", "quest", "qsn"],
        },
        remark: {
            requiresStatment: false,
            aliases: ["rem", "rmk", "rema", "bem", "subrem"],
        },
        task: { requiresStatment: true, aliases: [] },
        theorem: {
            requiresStatment: true,
            aliases: ["thm", "theo", "theor", "thmss", "thrm"],
        },
        warning: { requiresStatment: false, aliases: ["warn", "wrn"] },
    };
    // For each environment PreTeXt has, we create entries for `environmentReplacements` using all reasonable aliases
    const exapandedEnvAliases = Object.entries(envAliases).flatMap(
        ([env, spec]) => [
            [env, envFactory(env, spec.requiresStatment)],
            ...spec.aliases.map((name) => [
                name,
                envFactory(env, spec.requiresStatment),
            ]),
        ]
    );
    return Object.fromEntries(exapandedEnvAliases);
}
