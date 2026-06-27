import {
    htmlLike,
    isHtmlLikeTag,
} from "@unified-latex/unified-latex-util-html-like";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    getArgsContent,
    getNamedArgsContent,
} from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { wrapPars } from "../wrap-pars";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
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
interface EnvFactoryOptions {
    requiresStatementTag?: boolean;
    wrapContentInPars?: boolean;
    extractTitleFromArgs?: boolean;
    warningMessage?: string;
}

/**
 * Tags that should be siblings of `<statement>` rather than children of it,
 * when nested inside a theorem-like or exercise-like environment.
 * For example, `<proof>` must follow `<statement>` inside `<theorem>`.
 */
const STATEMENT_SIBLING_TAGS = new Set([
    "proof",
    "hint",
    "answer",
    "solution",
]);

function envFactory(
    tag: string,
    options: EnvFactoryOptions = {}
): (env: Ast.Environment, info: VisitInfo, file?: VFile) => Ast.Macro {
    const {
        requiresStatementTag = false,
        wrapContentInPars = true,
        extractTitleFromArgs = true,
        warningMessage = "",
    } = options;

    return (env, info, file) => {
        // add a warning message to the file if needed
        if (warningMessage && file) {
            const message = makeWarningMessage(env, warningMessage, "env-subs");
            file.message(message, message.place, message.source);
        }

        // Wrap content of the environment in paragraph tags
        let content: Ast.Node[];

        // Add a statement around the contents of the environment if requested.
        // Any nested environments that must be siblings of <statement> (e.g. <proof>)
        // are extracted before calling wrapPars so they don't end up buried inside a
        // paragraph tag, then placed after the <statement> tag.
        if (requiresStatementTag) {
            const statementEnvContent: Ast.Node[] = [];
            const statementSiblings: Ast.Node[] = [];
            for (const node of env.content) {
                if (
                    isHtmlLikeTag(node) &&
                    STATEMENT_SIBLING_TAGS.has(
                        (node as Ast.Macro).content.slice("html-tag:".length)
                    )
                ) {
                    statementSiblings.push(node);
                } else {
                    statementEnvContent.push(node);
                }
            }
            const statementContent = wrapContentInPars
                ? wrapPars(statementEnvContent)
                : statementEnvContent;
            content = [
                htmlLike({
                    tag: "statement",
                    content: statementContent,
                }),
                ...statementSiblings,
            ];
        } else {
            content = wrapContentInPars ? wrapPars(env.content) : env.content;
        }

        // Add a title tag if the environment has a title
        if (extractTitleFromArgs) {
            const args = getArgsContent(env);
            if (args[0]) {
                content.unshift(
                    htmlLike({
                        tag: "title",
                        content: args[0] || [],
                    })
                );
            }
        }
        // attach any additional attributes from renderInfo to the tag
        const attributes: Record<string, any> = {};
        if (env._renderInfo?.additionalAttributes) {
            Object.assign(attributes, env._renderInfo.additionalAttributes);
        }
        // Put it all together
        return htmlLike({
            tag: tag,
            content: content,
            attributes,
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
    tabular: createTableFromTabular,
    center: envFactory("blockquote"),
    quote: envFactory("blockquote"),
    figure: envFactory("figure", {
        requiresStatementTag: false,
        wrapContentInPars: false,
        extractTitleFromArgs: false,
    }),
    table: envFactory("table", {
        requiresStatementTag: false,
        wrapContentInPars: false,
        extractTitleFromArgs: false,
    }),
    // Verbatim/code block (Group H): emit raw content inside <pre>
    code: (env) =>
        htmlLike({
            tag: "pre",
            content: [{ type: "string", content: printRaw(env.content) }],
        }),
    // Complex environments
    //   poem: split raw content by \\ (lines) and blank lines (stanzas)
    poem: (env) => {
        const args = getArgsContent(env);
        const title = args[0];
        const raw = printRaw(env.content).trim();
        const stanzaTexts = raw.split(/\n[ \t]*\n/);
        const stanzas = stanzaTexts
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((stanzaText) => {
                // split lines on \\ (with optional trailing whitespace/newline)
                const lineTexts = stanzaText
                    .split(/\\\\[ \t]*\n?/)
                    .map((l) => l.trim())
                    .filter((l) => l.length > 0);
                const lines = lineTexts.map((lineText) =>
                    htmlLike({
                        tag: "line",
                        content: [{ type: "string", content: lineText }],
                    })
                );
                return htmlLike({ tag: "stanza", content: lines });
            });
        // Fallback: if no stanzas could be parsed, emit one stanza with the raw text
        if (stanzas.length === 0) {
            stanzas.push(
                htmlLike({
                    tag: "stanza",
                    content: [
                        htmlLike({
                            tag: "line",
                            content: [{ type: "string", content: raw }],
                        }),
                    ],
                })
            );
        }
        const children: Ast.Node[] = [];
        if (title) {
            children.push(htmlLike({ tag: "title", content: title }));
        }
        children.push(...stanzas);
        return htmlLike({ tag: "poem", content: children });
    },
    //   sidebyside: wrap content panels as-is
    sidebyside: envFactory("sidebyside", {
        requiresStatementTag: false,
        extractTitleFromArgs: false,
    }),
    //   program: emit raw content inside <program><input>; language from optional arg
    program: (env) => {
        const args = getArgsContent(env);
        const lang = args[0]
            ? printRaw(args[0]).trim()
            : undefined;
        const raw = printRaw(env.content).trim();
        const inputTag = htmlLike({
            tag: "input",
            content: [{ type: "string", content: raw }],
        });
        return htmlLike({
            tag: "program",
            content: [inputTag],
            attributes: lang ? { language: lang } : {},
        });
    },
    //   console: emit raw content inside <console>
    console: (env) =>
        htmlLike({
            tag: "console",
            content: [{ type: "string", content: printRaw(env.content).trim() }],
        }),
    //   sage: emit raw input inside <sage><input>
    sage: (env) =>
        htmlLike({
            tag: "sage",
            content: [
                htmlLike({
                    tag: "input",
                    content: [{ type: "string", content: printRaw(env.content).trim() }],
                }),
            ],
        }),
    //   webwork: wrap content as-is (usually empty or with seed attr)
    webwork: envFactory("webwork", { requiresStatementTag: false }),
    // Structural/frontmatter environments
    preface: envFactory("preface"),
    biography: envFactory("biography"),
    dedication: envFactory("dedication"),
    glossary: envFactory("glossary"),
    biblio: envFactory("biblio"),
    gi: envFactory("gi", { requiresStatementTag: false }),
    // Division-level block environments
    exercises: envFactory("exercises"),
    exercisegroup: envFactory("exercisegroup"),
    subexercises: envFactory("subexercises"),
    worksheet: envFactory("worksheet"),
    handout: envFactory("handout"),
    "reading-questions": envFactory("reading-questions"),
    readingquestions: envFactory("reading-questions"),
    solutions: envFactory("solutions"),
    introduction: envFactory("introduction"),
    conclusion: envFactory("conclusion"),
    paragraphs: envFactory("paragraphs"),
    objectives: envFactory("objectives"),
    outcomes: envFactory("outcomes"),
    // Figure-like named containers
    list: envFactory("list", {
        requiresStatementTag: false,
        wrapContentInPars: false,
        extractTitleFromArgs: false,
    }),
    listing: envFactory("listing", {
        requiresStatementTag: false,
        wrapContentInPars: false,
        extractTitleFromArgs: false,
    }),
    // SideBySide sub-structure
    sbsgroup: envFactory("sbsgroup", { requiresStatementTag: false }),
    stack: envFactory("stack", { requiresStatementTag: false }),
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
        { requiresStatement: boolean; aliases: string[] }
    > = {
        abstract: { requiresStatement: false, aliases: ["abs", "abstr"] },
        acknowledgement: { requiresStatement: false, aliases: ["ack"] },
        algorithm: { requiresStatement: true, aliases: ["algo", "alg"] },
        answer: { requiresStatement: false, aliases: ["ans"] },
        assumption: { requiresStatement: true, aliases: ["assu", "ass"] },
        axiom: { requiresStatement: true, aliases: ["axm"] },
        claim: { requiresStatement: true, aliases: ["cla"] },
        conjecture: {
            requiresStatement: true,
            aliases: ["con", "conj", "conjec"],
        },
        activity: { requiresStatement: false, aliases: [] },
        aside: { requiresStatement: false, aliases: [] },
        assemblage: { requiresStatement: false, aliases: [] },
        biographical: { requiresStatement: false, aliases: [] },
        case: { requiresStatement: false, aliases: [] },
        computation: { requiresStatement: false, aliases: ["comp"] },
        construction: { requiresStatement: false, aliases: [] },
        convention: { requiresStatement: false, aliases: ["conv"] },
        corollary: {
            requiresStatement: true,
            aliases: ["cor", "corr", "coro", "corol", "corss"],
        },
        definition: {
            requiresStatement: true,
            aliases: ["def", "defn", "dfn", "defi", "defin", "de"],
        },
        example: {
            requiresStatement: true,
            aliases: ["exam", "exa", "eg", "exmp", "expl", "exm"],
        },
        exercise: { requiresStatement: true, aliases: ["exer", "exers"] },
        data: { requiresStatement: false, aliases: [] },
        exploration: { requiresStatement: false, aliases: [] },
        fact: { requiresStatement: true, aliases: [] },
        heuristic: { requiresStatement: true, aliases: [] },
        hint: { requiresStatement: false, aliases: [] },
        historical: { requiresStatement: false, aliases: [] },
        hypothesis: { requiresStatement: true, aliases: ["hyp"] },
        identity: { requiresStatement: true, aliases: ["idnty"] },
        insight: { requiresStatement: false, aliases: [] },
        investigation: { requiresStatement: false, aliases: [] },
        lemma: {
            requiresStatement: true,
            aliases: ["lem", "lma", "lemm", "lm"],
        },
        notation: {
            requiresStatement: false,
            aliases: ["no", "nota", "ntn", "nt", "notn", "notat"],
        },
        note: { requiresStatement: false, aliases: ["notes"] },
        observation: { requiresStatement: false, aliases: ["obs"] },
        principle: { requiresStatement: true, aliases: [] },
        problem: { requiresStatement: true, aliases: ["prob", "prb"] },
        project: { requiresStatement: false, aliases: [] },
        proof: { requiresStatement: false, aliases: ["pf", "prf", "demo"] },
        proposition: {
            requiresStatement: true,
            aliases: ["prop", "pro", "prp", "props"],
        },
        question: {
            requiresStatement: true,
            aliases: ["qu", "ques", "quest", "qsn"],
        },
        remark: {
            requiresStatement: false,
            aliases: ["rem", "rmk", "rema", "bem", "subrem"],
        },
        task: { requiresStatement: true, aliases: [] },
        technology: { requiresStatement: false, aliases: ["tech"] },
        theorem: {
            requiresStatement: true,
            aliases: ["thm", "theo", "theor", "thmss", "thrm"],
        },
        solution: { requiresStatement: false, aliases: ["sol"] },
        warning: { requiresStatement: false, aliases: ["warn", "wrn"] },
    };
    // For each environment PreTeXt has, we create entries for `environmentReplacements` using all reasonable aliases
    const exapandedEnvAliases = Object.entries(envAliases).flatMap(
        ([env, spec]) => [
            [
                env,
                envFactory(env, {
                    requiresStatementTag: spec.requiresStatement,
                }),
            ],
            ...spec.aliases.map((name) => [
                name,
                envFactory(env, {
                    requiresStatementTag: spec.requiresStatement,
                }),
            ]),
        ]
    );
    return Object.fromEntries(exapandedEnvAliases);
}
