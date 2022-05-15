import * as SystemeSpec from "./types";
import * as Ast from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { match } from "@unified-latex/unified-latex-util-match";
import { arrayJoin } from "@unified-latex/unified-latex-util-split";
import { parse } from "./parser";
import { structuredClone } from "@unified-latex/structured-clone";
import { deleteComments } from "@unified-latex/unified-latex-util-comments";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { updateRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

const AMP: Ast.String = { type: "string", content: "&" };
const SEP: Ast.Macro = { type: "macro", content: "\\" };
const QUAD: Ast.Macro = { type: "macro", content: "quad" };
const PLUS: Ast.String = { type: "string", content: "+" };
const COLUMN_KERN_ADJUSTMENT: Ast.Node[] = [
    { type: "string", content: "@" },
    {
        type: "group",
        content: [
            { type: "macro", content: "mkern" },
            { type: "string", content: "5mu" },
        ],
    },
];

/**
 * Return a map giving the sorted index of each variable in `vars`. There
 * may be duplicated variables in `vars`. The map will send duplicates to the same index.
 *
 * @param {Ast.Node[][]} vars
 * @returns
 */
function sortVariables(
    vars: Ast.Node[][],
    whitelistedVariables?: Ast.Node[] | null
) {
    const varMap = new Map(vars.map((v) => [v, printRaw(v)]));
    const varNames = Array.from(new Set(varMap.values()));
    varNames.sort();
    const nameToPos = whitelistedVariables
        ? new Map(whitelistedVariables.map((v, i) => [printRaw(v), i]))
        : new Map(varNames.map((name, i) => [name, i]));

    return new Map(
        Array.from(varMap.entries()).map(([variable, name]) => {
            return [variable, nameToPos.get(name) ?? -1];
        })
    );
}

/**
 * Make an array of arrays representing the operation/content of each item in an equation
 * + the annotation. The return value is suitable to be joined with `&` for the body of an array.
 */
function processLine(
    line: SystemeSpec.Line,
    numVars: number,
    varOrder: Map<Ast.Node[], number>,
    hasEquals: boolean,
    hasAnnotation: boolean
) {
    const ret: Ast.Node[][] = [];
    if (line.equation) {
        // We need to combine all non-var items into a single expression
        const nonVarItems = line.equation.left.filter(
            (item) => item.variable == null
        );
        const varItems = line.equation.left.filter(
            (item) => item.variable != null
        );
        let nonVarTerm: SystemeSpec.Item | null = null;
        if (nonVarItems.length === 1) {
            nonVarTerm = nonVarItems[0];
        } else if (nonVarItems.length > 1) {
            // We need to combine all the items. We do so by constructing a new item with the rest of the item's contents
            // added on the back
            nonVarTerm = {
                ...nonVarItems[0],
                content: nonVarItems[0].content.concat(
                    nonVarItems.slice(1).flatMap((item) => {
                        if (item.op) {
                            return [item.op, ...item.content];
                        }
                        return [PLUS, ...item.content];
                    })
                ),
            };
        }

        const allItems = nonVarTerm ? varItems.concat(nonVarTerm) : varItems;

        const indexToItem = new Map(
            allItems.map((item) => {
                if (item.variable == null) {
                    return [numVars - 1, item];
                }
                return [varOrder.get(item.variable), item];
            })
        );

        let isFirstItem = true;
        for (let i = 0; i < numVars; i++) {
            const item = indexToItem.get(i);
            if (item) {
                if (
                    isFirstItem &&
                    (match.string(item.op, "+") || item.op == null)
                ) {
                    // If the first item starts with a plus or doesn't have a starting operation,
                    // we don't use a starting symbol.
                    ret.push([]);
                    ret.push(item.content);
                } else {
                    // If we are not the first item, we always push an operation
                    ret.push([item.op || PLUS]);
                    ret.push(item.content);
                }
                isFirstItem = false;
            } else {
                // If there is no item for this position, we push a blank operation and content
                ret.push([]);
                ret.push([]);
            }
        }
        // If we have an equals, we need to push its contents
        if (hasEquals) {
            const equalsPart = (
                line.equation.equals ? [line.equation.equals] : []
            ).concat(line.equation.right);
            ret.push(equalsPart);
        }
    }
    // If we have an annotation, we need to push it or a blank
    if (hasAnnotation) {
        ret.push(line.annotation ? line.annotation.content : []);
    }

    return ret;
}

/**
 * Add kerning information to the array specification. E.g. `crl` becomes `c@{\mkern5mu}r@{\mkern5mu}l`.
 * This is so the operations when typesetting a system of equations are properly spaced.
 */
function arraySpecToSpacedArraySpec(spec: string, hasAnnotation?: boolean) {
    const annotationSpec = hasAnnotation ? spec.charAt(spec.length - 1) : "";
    const bodySpec = hasAnnotation ? spec.slice(0, spec.length - 1) : spec;

    const bodyStrings: Ast.Node[][] = Array.from(bodySpec).map((x) => [
        { type: "string", content: x },
    ]);
    const body = arrayJoin(bodyStrings, COLUMN_KERN_ADJUSTMENT);
    return annotationSpec
        ? body.concat({ type: "string", content: annotationSpec })
        : body;
}

/**
 * Extract the variables from a systeme system of equations.
 */
export function extractVariables(nodes: SystemeSpec.Node[]): Ast.Node[][] {
    return nodes.flatMap((node) => {
        if (node.type === "line" && node.equation) {
            return extractVariables(node.equation.left);
        }
        if (node.type === "equation") {
            return node.left.flatMap((item) =>
                item.variable ? [item.variable] : []
            );
        }
        if (node.type === "item") {
            return node.variable ? [node.variable] : [];
        }
        return [];
    });
}

/**
 * Remove any whitespace from the variable list (including an explicit " " string).
 * As well, filter out any non-macro/non-string items.
 */
function normalizeVariableWhitelist(
    vars: (string | Ast.Node)[] | null | undefined
) {
    if (!vars) {
        return null;
    }
    const normalized: Ast.Node[] = vars.map((v) =>
        typeof v === "string" ? { type: "string", content: v } : v
    );
    const ret = normalized.filter(
        (v) =>
            (match.anyMacro(v) || match.anyString(v)) &&
            !match.string(v, " ") &&
            !match.whitespace(v)
    ) as (Ast.Macro | Ast.String)[];
    return ret;
}

/**
 * Lays out the contents of a \systeme{...} macro as an array. This function sorts the variables
 * in alphabetical order and lays out any annotations. An `\begin{array}...\end{array}` environment
 * is returned.
 *
 * If `properSpacing=true` then kerning information will be included in the array specification to space
 * the operators correctly. This kerning information will make the specification long (and may make it incompatible
 * with KaTeX).
 *
 * An optional whitelist of variables may be supplied. If supplied, only listed items will count as variables and
 * the order of variable appearance will be the same as the order of the whitelisted variables.
 */
export function systemeContentsToArray(
    nodes: Ast.Node[],
    options?: {
        properSpacing?: boolean;
        whitelistedVariables?: (string | Ast.String | Ast.Macro)[];
    }
) {
    nodes = structuredClone(nodes);
    deleteComments(nodes);
    const { properSpacing = true, whitelistedVariables } = options || {};
    const coercedWhitelistedVariables =
        normalizeVariableWhitelist(whitelistedVariables);
    const systemeAst = parse(nodes, { whitelistedVariables });
    const vars = extractVariables(systemeAst);
    const varOrder = sortVariables(vars, coercedWhitelistedVariables);
    let numVars = coercedWhitelistedVariables
        ? coercedWhitelistedVariables.length
        : Math.max(...Array.from(varOrder.values())) + 1;
    // If there are terms with no variable, we need a spot for them
    if (
        systemeAst.some((line) => {
            if (line.equation) {
                return line.equation.left.some((item) => item.variable == null);
            }
        })
    ) {
        numVars += 1;
    }
    const hasEquals = systemeAst.some(
        (line) => line.equation && line.equation.equals
    );
    const hasAnnotation = systemeAst.some((line) => line.annotation);

    let rows = systemeAst.map((line) =>
        processLine(line, numVars, varOrder, hasEquals, hasAnnotation)
    );
    // If we have no leading `-` signs (e.g., only leading `+` or bank signs)
    // We don't need space for the first operation to be stored
    const noLeadingOperation = rows.every((row) => row[0].length === 0);

    // Every item in an equation has a centered operation and a right-aligned variable part.
    let arraySignature = Array.from({ length: numVars }, () => "cr").join("");
    if (noLeadingOperation) {
        // We might not have a leading operation on the first item(s)
        arraySignature = arraySignature.slice(1);
        rows = rows.map((row) => row.slice(1));
    }
    if (hasEquals) {
        // The part after the equals is left-aligned
        arraySignature += "l";
    }
    if (hasAnnotation) {
        // The annotation is left-aligned
        arraySignature += "l";
        // We also manually insert space in front of any annotation
        rows = rows.map((row) => {
            if (row[row.length - 1].length === 0) {
                return row;
            }
            return [
                ...row.slice(0, row.length - 1),
                [QUAD, { type: "whitespace" }, ...row[row.length - 1]],
            ];
        });
    }

    // By default, the array signature will put lots of space between items.
    // We can correct for that manually.
    const arraySignatureWithSpacing: Ast.Node[] = properSpacing
        ? arraySpecToSpacedArraySpec(arraySignature, hasAnnotation)
        : [{ type: "string", content: arraySignature }];

    const bodyRows = rows.map((row) => arrayJoin(row, AMP));
    const body = arrayJoin(bodyRows, SEP);

    const ret: Ast.Environment = {
        type: "environment",
        env: "array",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: arraySignatureWithSpacing,
            },
        ],
        content: body,
    };

    return ret;
}

/**
 * Find any systeme definitions, e.g. `\sysdelim{.}{.}`, and attach their information
 * to the renderInfo of of the systeme macros.
 *
 */
export function attachSystemeSettingsAsRenderInfo(ast: Ast.Ast) {
    const systemeMatcher = match.createMacroMatcher(["systeme", "sysdelim"]);

    visit(
        ast,
        (nodes, info) => {
            if (!info.context.inMathMode || !nodes.some(systemeMatcher)) {
                return;
            }
            // Find the positions of the systeme and sysdelim macros
            const systemeLocations = nodes.flatMap((node, i) =>
                match.macro(node, "systeme") ? i : []
            );
            const sysdelimLocations = nodes.flatMap((node, i) =>
                match.macro(node, "sysdelim") ? i : []
            );

            if (
                systemeLocations.length === 0 ||
                sysdelimLocations.length === 0
            ) {
                return;
            }

            for (const i of systemeLocations) {
                // Find any sysdelim macros that occur before
                const lastSysdelim = Math.max(
                    ...sysdelimLocations.filter((loc) => loc < i)
                );
                if (lastSysdelim >= 0) {
                    const node = nodes[i];
                    const sysdelimMacro = nodes[lastSysdelim];
                    if (!match.anyMacro(sysdelimMacro)) {
                        throw new Error(
                            `Expecting sysdelim macro but found "${printRaw(
                                sysdelimMacro
                            )}"`
                        );
                    }
                    const args = getArgsContent(sysdelimMacro);
                    updateRenderInfo(node, { sysdelims: args });
                }
            }
        },
        {
            test: Array.isArray,
            includeArrays: true,
        }
    );
}
