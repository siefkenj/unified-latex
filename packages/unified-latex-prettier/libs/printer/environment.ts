import type { Doc } from "prettier";
import * as PrettierTypes from "./prettier-types";
import {
    getNodeInfo,
    softline,
    fill,
    indent,
    hardline,
    line,
    ESCAPE,
    formatEnvSurround,
    joinWithSoftline,
    formatDocArray,
} from "./common";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { parseAlignEnvironment } from "@unified-latex/unified-latex-util-align";
import * as Ast from "@unified-latex/unified-latex-types";
import { trim } from "@unified-latex/unified-latex-util-trim";

export function printVerbatimEnvironment(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.VerbatimEnvironment;

    const env = formatEnvSurround(node as any);

    return [env.start, node.content, env.end];
}

export function printEnvironment(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Environment;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const args = node.args ? path.map(print, "args" as any) : [];
    const env = formatEnvSurround(node);

    let content = path.map(print, "content");
    content = formatDocArray(node.content, content, options);
    if (renderInfo.inMathMode) {
        content = joinWithSoftline(content);
    }

    // If we start with a comment on the same line as the environment
    // We should not insert a newline at the start of the environment body
    let bodyStartToken: PrettierTypes.Doc[] = [hardline];
    if (
        node.content.length === 0 ||
        (node.content[0].type === "comment" && node.content[0].sameline)
    ) {
        bodyStartToken.pop();
    }

    return [
        env.start,
        ...args,
        indent(fill(bodyStartToken.concat(content))),
        hardline,
        env.end,
    ];
}

export function printAlignedEnvironment(
    path: PrettierTypes.AstPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Environment;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const args = node.args ? path.map(print, "args" as any) : [];
    const env = formatEnvSurround(node);

    // If an aligned environment starts with a same-line comment, we want
    // to ignore it. It will be printed by the environment itself.
    const leadingComment =
        node.content[0] &&
        node.content[0].type === "comment" &&
        node.content[0].sameline
            ? node.content[0]
            : null;

    const { rows, rowSeps, trailingComments } = formatAlignedContent(
        leadingComment ? node.content.slice(1) : node.content
    );

    const content = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowSep = rowSeps[i];
        const trailingComment = trailingComments[i];

        // A row has
        // 1) Content
        // 2) (optional) rowSep (e.g., `\\`)
        // 3) (optional) comment
        // We want there to be exactly one space before the rowsep and exactly one space
        // before any comment.
        content.push(row);
        if (rowSep) {
            content.push(printRaw(rowSep));
        }
        if (rowSep && trailingComment) {
            content.push(" ");
        }
        if (trailingComment) {
            content.push(["%", printRaw(trailingComment.content)]);
        }
        if (rowSep || trailingComment) {
            content.push(hardline);
        }
    }
    // Make sure the last item is not a `hardline`.
    if (content[content.length - 1] === hardline) {
        content.pop();
    }

    if (leadingComment) {
        content.unshift(
            leadingComment.leadingWhitespace ? " " : "",
            "%" + printRaw(leadingComment.content),
            hardline
        );
        return [env.start, ...args, indent(content), hardline, env.end];
    }
    return [
        env.start,
        ...args,
        indent([hardline, ...content]),
        hardline,
        env.end,
    ];
}

/**
 * Formats the content of an aligned/tabular environment's content.
 * Ensures the "&" delimiters all line up.
 *
 * @export
 * @param {[object]} nodes
 * @returns {{rows: [string], rowSeps: [object]}}
 */
export function formatAlignedContent(nodes: Ast.Node[]) {
    function getSpace(len = 1) {
        return " ".repeat(len);
    }

    const rows = parseAlignEnvironment(nodes as any);
    // Find the number of columns
    const numCols = Math.max(...rows.map((r) => r.cells.length));
    const rowSeps = rows.map(({ rowSep }) => printRaw(rowSep || []));
    const trailingComments = rows.map(({ trailingComment }) => trailingComment);

    // Get the widths of each column.
    // Column widths will be the width of column contents plus the width
    // of the separator. This way, even multi-character separators
    // can be accommodated when rendering.
    const renderedRows = rows.map(({ cells, colSeps }) => ({
        cells: cells.map((nodes) => {
            trim(nodes);

            return printRaw(nodes);
        }),
        seps: colSeps.map((nodes) => printRaw(nodes)),
    }));
    const colWidths: number[] = [];
    for (let i = 0; i < numCols; i++) {
        colWidths.push(
            Math.max(
                ...renderedRows.map(
                    ({ cells, seps }) =>
                        ((cells[i] || "") + (seps[i] || "")).length
                )
            )
        );
    }

    const joinedRows = renderedRows.map(({ cells, seps }) => {
        if (cells.length === 1 && cells[0] === "") {
            return "";
        }
        let ret = "";
        for (let i = 0; i < cells.length; i++) {
            // There are at least as many cells as there are `seps`. Possibly one extra
            const width = colWidths[i] - (seps[i] || "").length;

            // Insert a space at the start so we don't run into the prior separator.
            // We'll trim this off in the end, in case it's not needed.
            ret +=
                (i === 0 ? "" : " ") +
                cells[i] +
                getSpace(width - cells[i].length + 1) +
                (seps[i] || "");
        }
        return ret;
    });

    return { rows: joinedRows, rowSeps, trailingComments };
}
