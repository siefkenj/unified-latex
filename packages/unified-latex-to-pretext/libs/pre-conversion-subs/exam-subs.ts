import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { arg } from "@unified-latex/unified-latex-builder";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    MacroInfoRecord,
    EnvInfoRecord,
} from "@unified-latex/unified-latex-types";
import {
    getArgsContent,
    gobbleArguments,
} from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { visit, VisitInfo } from "@unified-latex/unified-latex-util-visit";
import { environments as examCtnEnvironments } from "@unified-latex/unified-latex-ctan/package/exam";
import { wrapPars } from "../wrap-pars";
import { trim } from "@unified-latex/unified-latex-util-trim";

type HtmlAttributes = Record<string, string>;

/**
 * Macro signatures for exam-class item macros.
 * All have an optional argument for point values, e.g. `\question[5]`.
 */
export const examMacros: MacroInfoRecord = {
    question: { signature: "o" },
    part: { signature: "o" },
    subpart: { signature: "o" },
    subsubpart: { signature: "o" },
};

/**
 * Environment info for exam-class list environments, re-exported from the
 * CTAN exam package. These use `processContent` to attach item bodies as args.
 */
export const examEnvironments: EnvInfoRecord = {
    questions: examCtnEnvironments["questions"],
    parts: examCtnEnvironments["parts"],
    subparts: examCtnEnvironments["subparts"],
    subsubparts: examCtnEnvironments["subsubparts"],
};

const EXAM_ITEM_MACROS = new Set([
    "question",
    "part",
    "subpart",
    "subsubpart",
]);

/**
 * The default parser already runs `cleanEnumerateBody` on exam environments via the
 * CTAN exam environment info. This means item macros like `\question[5] body` have
 * their entire body (including the `[5]`) placed into `args[0]` with openMark:"".
 *
 * However, `\part` is also a document-division macro with signature `"s o m"` in the
 * standard LaTeX2e macros. The parser attaches those args first (star, optional, mandatory),
 * and then `cleanEnumerateBody` appends the remaining body as an additional arg.  So for
 * `\part[3] First part`, the args are: [sArg, {openMark:"[", content:["3"]}, {openMark:"{",
 * content:["First"]}, {openMark:"", content:[" part"]}].
 *
 * This function re-processes exam item macros to normalize them to a two-arg form:
 *   args[0] = optional points arg (Argument with openMark:"[" if present, else empty)
 *   args[1] = body content arg (Argument with openMark:"")
 */
export function fixExamMacroArgs(tree: Ast.Root): void {
    visit(
        tree,
        (node) => {
            const macro = node as Ast.Macro;
            if (!EXAM_ITEM_MACROS.has(macro.content)) return;
            if (!macro.args || macro.args.length === 0) return;

            const lastArg = macro.args[macro.args.length - 1];

            if (macro.args.length >= 4 && macro.args[macro.args.length - 2].openMark === "{" && lastArg.openMark === "") {
                // \part (and similar) was processed with the latex2e "s o m" signature before
                // cleanEnumerateBody appended the body. The args are:
                //   [sArg, oArg(points), mArg(stolen first token), bodyArg]
                // Reconstruct as [pointsArg, fullBodyArg].
                const pointsArg = macro.args[macro.args.length - 3];
                const mandatoryContent = macro.args[macro.args.length - 2].content;
                const bodyContent = lastArg.content;
                macro.args = [
                    pointsArg,
                    arg([...mandatoryContent, ...bodyContent], { openMark: "", closeMark: "" }),
                ];
                return;
            }

            // For macros with only the body arg (openMark:"") from cleanEnumerateBody
            // (e.g. \question, \subpart, \subsubpart): gobble an optional [N] from the body.
            if (macro.args.length !== 1 || lastArg.openMark !== "") return;

            // Shallow-copy body content so gobble mutations don't affect the original arg
            const bodyContent = [...lastArg.content];

            // Attempt to gobble an optional [N] from the start of the body
            const { args: parsedArgs } = gobbleArguments(bodyContent, "o");
            const pointsArg = parsedArgs[0];

            // Reconstruct: args[0] = optional points, args[1] = remaining body
            macro.args = [
                pointsArg,
                arg(bodyContent, { openMark: "", closeMark: "" }),
            ];
        },
        { test: match.anyMacro }
    );
}

/**
 * Extract the point value from an exam item macro's optional argument.
 * Returns the trimmed string value, or undefined if no points were specified.
 */
function getPointsAttribute(
    node: Ast.Macro
): Record<string, string> | Record<string, never> {
    const args = getArgsContent(node);
    const pointsArg = args[0];
    if (pointsArg && pointsArg.length > 0) {
        const value = printRaw(pointsArg).trim();
        if (value) {
            return { points: value };
        }
    }
    return {};
}

/**
 * Get the body content from an exam item macro (the last argument,
 * attached by `cleanEnumerateBody`).
 */
function getItemBody(node: Ast.Macro): Ast.Node[] {
    if (!node.args || node.args.length === 0) {
        return [];
    }
    return node.args[node.args.length - 1].content;
}

function isWhitespaceLike(node: Ast.Node): boolean {
    return node.type === "whitespace" || node.type === "comment";
}

function isVfillMacro(node: Ast.Node): boolean {
    return match.macro(node, "vfill") || match.macro(node, "vfil");
}

function isVspaceMacro(node: Ast.Node): boolean {
    return match.macro(node, "vspace");
}

function getVspaceWorkspace(node: Ast.Macro): string | undefined {
    const args = getArgsContent(node);
    for (let i = args.length - 1; i >= 0; i--) {
        const argContent = args[i];
        if (!argContent || argContent.length === 0) {
            continue;
        }
        const value = printRaw(argContent).trim();
        if (value) {
            return value;
        }
    }
    return undefined;
}

function extractTrailingWorkspace(bodyNodes: Ast.Node[]): {
    bodyNodes: Ast.Node[];
    workspace?: string;
} {
    const remainingBody = [...bodyNodes];

    while (
        remainingBody.length > 0 &&
        isWhitespaceLike(remainingBody[remainingBody.length - 1])
    ) {
        remainingBody.pop();
    }

    const lastNode = remainingBody[remainingBody.length - 1];
    if (!lastNode) {
        return { bodyNodes: remainingBody };
    }

    if (isVfillMacro(lastNode)) {
        remainingBody.pop();
        trim(remainingBody);
        return { bodyNodes: remainingBody, workspace: "1in" };
    }

    if (isVspaceMacro(lastNode)) {
        const workspace = getVspaceWorkspace(lastNode as Ast.Macro);
        if (!workspace) {
            return { bodyNodes: remainingBody };
        }

        remainingBody.pop();
        trim(remainingBody);
        return { bodyNodes: remainingBody, workspace };
    }

    if (lastNode.type !== "string") {
        return { bodyNodes: remainingBody };
    }

    let index = remainingBody.length - 2;
    while (index >= 0 && isWhitespaceLike(remainingBody[index])) {
        index--;
    }

    const macroNode = remainingBody[index];
    if (!macroNode || !match.macro(macroNode, "vskip")) {
        return { bodyNodes: remainingBody };
    }

    const workspace = lastNode.content.trim();
    if (!workspace) {
        return { bodyNodes: remainingBody };
    }

    remainingBody.splice(index);
    trim(remainingBody);
    return { bodyNodes: remainingBody, workspace };
}

function getExamItemAttributes(node: Ast.Macro): {
    attributes: HtmlAttributes;
    bodyNodes: Ast.Node[];
} {
    const pointsAttributes = getPointsAttribute(node);
    const { bodyNodes, workspace } = extractTrailingWorkspace(getItemBody(node));

    return {
        attributes: workspace
            ? { ...pointsAttributes, workspace }
            : pointsAttributes,
        bodyNodes,
    };
}

/**
 * Tags that are solution-like (not part of the statement body).
 * In PreTeXt, these are siblings of `<statement>`, not inside it.
 */
const SOLUTION_LIKE_TAGS = new Set([
    "html-tag:solution",
    "html-tag:answer",
    "html-tag:hint",
]);

function isSolutionLike(node: Ast.Node): boolean {
    return match.anyMacro(node) && SOLUTION_LIKE_TAGS.has((node as Ast.Macro).content);
}

/**
 * Split body nodes into statement content (before any solution-like nodes)
 * and the solution-like nodes themselves (solution, answer, hint).
 */
function splitStatementFromSolutions(bodyNodes: Ast.Node[]): {
    statementNodes: Ast.Node[];
    solutionNodes: Ast.Node[];
} {
    const firstSolutionIdx = bodyNodes.findIndex(isSolutionLike);
    if (firstSolutionIdx === -1) {
        return { statementNodes: bodyNodes, solutionNodes: [] };
    }
    return {
        statementNodes: bodyNodes.slice(0, firstSolutionIdx),
        solutionNodes: bodyNodes.filter(isSolutionLike),
    };
}

/**
 * Check whether a node is a converted `<task>` html-like element.
 */
function isTaskNode(node: Ast.Node): boolean {
    return match.macro(node, "html-tag:task");
}

function isPageBreakNode(node: Ast.Node): boolean {
    return match.macro(node, "newpage") || match.macro(node, "clearpage");
}

/**
 * Build a `<task>` element from an item macro (`\part` or `\subpart`).
 * If the body contains converted sub-task nodes, the content before them
 * becomes an `<introduction>` and the tasks follow directly.
 * Otherwise the body is wrapped in a `<statement>`.
 */
function buildTask(itemMacro: Ast.Macro): Ast.Node {
    const { attributes, bodyNodes } = getExamItemAttributes(itemMacro);

    const firstTaskIndex = bodyNodes.findIndex(isTaskNode);

    if (firstTaskIndex === -1) {
        // No sub-tasks: split statement from any solution-like nodes
        const { statementNodes, solutionNodes } =
            splitStatementFromSolutions(bodyNodes);
        return htmlLike({
            tag: "task",
            attributes,
            content: [
                htmlLike({
                    tag: "statement",
                    content: wrapPars(statementNodes),
                }),
                ...solutionNodes,
            ],
        });
    } else {
        // Has sub-tasks: split intro from the task nodes
        const introNodes = bodyNodes.slice(0, firstTaskIndex);
        const taskNodes = bodyNodes.filter(isTaskNode);

        const content: Ast.Node[] = [];
        trim(introNodes);
        if (introNodes.length > 0) {
            content.push(
                htmlLike({
                    tag: "introduction",
                    content: wrapPars(introNodes),
                })
            );
        }
        content.push(...taskNodes);

        return htmlLike({ tag: "task", attributes, content });
    }
}

/**
 * Convert a `subsubparts` environment to an array of `<task>` html-like nodes.
 */
function subsubpartsToTasks(env: Ast.Environment): Ast.Node[] {
    const itemMacros = env.content.filter((node) =>
        match.macro(node, "subsubpart")
    );
    return itemMacros.reduce<Ast.Node[]>((tasks, node) => {
        if (!match.macro(node) || !node.args) {
            return tasks;
        }
        const { attributes, bodyNodes } = getExamItemAttributes(node);
        tasks.push(
            htmlLike({
                tag: "task",
                attributes,
                content: [
                    htmlLike({ tag: "statement", content: wrapPars(bodyNodes) }),
                ],
            })
        );
        return tasks;
    }, []);
}

/**
 * Convert a `subparts` environment to an array of `<task>` html-like nodes.
 */
function subpartsToTasks(env: Ast.Environment): Ast.Node[] {
    const itemMacros = env.content.filter((node) =>
        match.macro(node, "subpart")
    );
    return itemMacros.reduce<Ast.Node[]>((tasks, node) => {
        if (!match.macro(node) || !node.args) {
            return tasks;
        }
        tasks.push(buildTask(node));
        return tasks;
    }, []);
}

/**
 * Convert a `parts` environment to an array of `<task>` html-like nodes.
 */
function partsToTasks(env: Ast.Environment): Ast.Node[] {
    const itemMacros = env.content.filter((node) =>
        match.macro(node, "part")
    );
    return itemMacros.reduce<Ast.Node[]>((tasks, node) => {
        if (!match.macro(node) || !node.args) {
            return tasks;
        }
        tasks.push(buildTask(node));
        return tasks;
    }, []);
}

/**
 * Convert a `questions` environment to an `<exercises>` html-like node
 * containing `<exercise>` elements.
 *
 * Each `\question` becomes an `<exercise>`. If the question body contains
 * converted `<task>` nodes (from a nested `parts` environment), the content
 * before them becomes an `<introduction>` and the tasks are placed directly
 * inside the `<exercise>`. Otherwise the body is wrapped in a `<statement>`.
 */
function questionsToExercises(
    env: Ast.Environment,
    _info: VisitInfo
): Ast.Node {
    // Extract an optional \title{...} that appears before the first \question.
    // cleanEnumerateBody keeps pre-item content in env.content, so \title{...}
    // will appear with its {arg} already attached by the parser.
    const titleMacro = env.content.find((n) =>
        match.macro(n, "title")
    ) as Ast.Macro | undefined;
    const titleArg = titleMacro?.args?.find((a) => a.openMark === "{");
    const titleElement =
        titleArg && titleArg.content.length > 0
            ? htmlLike({ tag: "title", content: titleArg.content })
            : undefined;

    function extractTrailingPageBreak(bodyNodes: Ast.Node[]): {
        bodyNodes: Ast.Node[];
        breakAfter: boolean;
    } {
        const remainingBody = [...bodyNodes];

        while (
            remainingBody.length > 0 &&
            isWhitespaceLike(remainingBody[remainingBody.length - 1])
        ) {
            remainingBody.pop();
        }

        const lastNode = remainingBody[remainingBody.length - 1];
        if (!lastNode || !isPageBreakNode(lastNode)) {
            return { bodyNodes: remainingBody, breakAfter: false };
        }

        remainingBody.pop();
        trim(remainingBody);
        return { bodyNodes: remainingBody, breakAfter: true };
    }

    function questionToExercise(node: Ast.Macro): {
        exercise: Ast.Node;
        breakAfter: boolean;
    } {
        const { attributes, bodyNodes: rawBodyNodes } = getExamItemAttributes(node);
        const { bodyNodes, breakAfter } = extractTrailingPageBreak(rawBodyNodes);
        const firstTaskIndex = bodyNodes.findIndex(isTaskNode);

        let exerciseContent: Ast.Node[];

        if (firstTaskIndex === -1) {
            // Simple question — split statement from solution-like nodes
            const { statementNodes, solutionNodes } =
                splitStatementFromSolutions(bodyNodes);
            exerciseContent = [
                htmlLike({
                    tag: "statement",
                    content: wrapPars(statementNodes),
                }),
                ...solutionNodes,
            ];
        } else {
            // Question with parts — split intro from the task nodes
            const introNodes = bodyNodes.slice(0, firstTaskIndex);
            const taskNodes = bodyNodes.filter(isTaskNode);

            exerciseContent = [];
            trim(introNodes);
            if (introNodes.length > 0) {
                exerciseContent.push(
                    htmlLike({
                        tag: "introduction",
                        content: wrapPars(introNodes),
                    })
                );
            }
            exerciseContent.push(...taskNodes);
        }

        return {
            exercise: htmlLike({
                tag: "exercise",
                attributes,
                content: exerciseContent,
            }),
            breakAfter,
        };
    }

    const convertedQuestions = env.content.reduce<
        { exercise: Ast.Node; breakAfter: boolean }[]
    >((items, node) => {
        if (!match.macro(node, "question") || !node.args) {
            return items;
        }

        items.push(questionToExercise(node));
        return items;
    }, []);

    if (!convertedQuestions.some((question) => question.breakAfter)) {
        const exercises = convertedQuestions.map((question) => question.exercise);
        return htmlLike({
            tag: "worksheet",
            content: titleElement ? [titleElement, ...exercises] : exercises,
        });
    }

    const pages: Ast.Node[] = [];
    let currentPageContent: Ast.Node[] = [];

    const closePage = () => {
        pages.push(
            htmlLike({
                tag: "page",
                content: currentPageContent,
            })
        );
        currentPageContent = [];
    };

    for (const question of convertedQuestions) {
        currentPageContent.push(question.exercise);
        if (question.breakAfter) {
            closePage();
        }
    }

    closePage();

    // Wrap all pages in a <worksheet> when explicit page breaks are present.
    return htmlLike({
        tag: "worksheet",
        content: titleElement ? [titleElement, ...pages] : pages,
    });
}

/**
 * Environment replacement rules for the exam documentclass.
 */
export const examEnvironmentReplacements: Record<
    string,
    (
        node: Ast.Environment,
        info: VisitInfo
    ) => Ast.Node | Ast.Node[]
> = {
    questions: questionsToExercises,
    parts: partsToTasks,
    subparts: subpartsToTasks,
    subsubparts: subsubpartsToTasks,
};
