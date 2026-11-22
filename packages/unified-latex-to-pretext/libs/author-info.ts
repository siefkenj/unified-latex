import * as Ast from "@unified-latex/unified-latex-types";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import { htmlLike } from "@unified-latex/unified-latex-util-html-like";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { splitOnMacro } from "@unified-latex/unified-latex-util-split";
import { trim } from "@unified-latex/unified-latex-util-trim";
import { VFileMessage } from "vfile-message";
import { VFile } from "vfile";
import { hasMeaningfulContent } from "./pre-conversion-subs/utils";

/** One PreTeXt `<author>`'s fields, keyed by tag name (`personname`, `institution`, `email`). */
export type AuthorInfo = Record<string, Ast.Node[]>;

/**
 * Visits `\author`/`\address`/`\email` wherever they appear (preamble or
 * body) and groups them into one record per person: each `\author{...}`
 * starts a new group, and any `\address`/`\email` that follows (before the
 * next `\author`) is folded into that same group. This matches the common
 * LaTeX convention of repeating author/address/email once per person (e.g.
 * amsart-style multi-author papers). An `\address`/`\email` that appears
 * before any `\author` becomes its own standalone group.
 *
 * A single `\author{A \and B}` names several people (the standard LaTeX and
 * beamer convention), so it starts one group per `\and`-separated name.
 * Beamer's `\institute{\inst{1} X \and \inst{2} Y}` is matched to those names
 * by their `\inst{n}` markers -- or by position when there are none, with a
 * lone institute applying to everyone -- and becomes each one's
 * `<institution>`, unless an `\address` already gave them one.
 */
export function gatherAuthorInfo(ast: Ast.Ast, file: VFile): AuthorInfo[] {
    const authorList: AuthorInfo[] = [];
    // The people named by `\author` (not `\address`-only groups), with the
    // `\inst{n}` markers that followed each name.
    const people: { info: AuthorInfo; insts: string[] }[] = [];
    let institutes: { content: Ast.Node[]; insts: string[] }[] = [];
    let currentGroup: AuthorInfo | null = null;

    visit(ast, (node) => {
        if (match.macro(node, "author") && node.args) {
            for (const name of splitOnAnd(lastArgContent(node))) {
                const { content, insts } = extractInstMarkers(name);
                const personname = removeThanks(content, file);
                if (!hasMeaningfulContent(personname)) {
                    continue;
                }
                currentGroup = { personname };
                authorList.push(currentGroup);
                people.push({ info: currentGroup, insts });
            }
        } else if (match.macro(node, "institute") && node.args) {
            institutes = splitOnAnd(lastArgContent(node)).map(
                extractInstMarkers
            );
        } else if (match.macro(node, "address") && node.args) {
            const content = lastArgContent(node);
            if (currentGroup) {
                currentGroup.institution = content;
            } else {
                authorList.push({ institution: content });
            }
        } else if (match.macro(node, "email") && node.args) {
            const content = lastArgContent(node);
            if (currentGroup) {
                currentGroup.email = content;
            } else {
                authorList.push({ email: content });
            }
        } else if (match.macro(node, "affil")) {
            const message = createVFileMessage(node);
            file.message(message, message.place, "latex-to-pretext:warning");
        }
    });
    assignInstitutes(people, institutes);
    return authorList;
}

/** The last (mandatory) argument's content; `\author`/`\address`/`\email` all have signature `o m`. */
function lastArgContent(macro: Ast.Macro): Ast.Node[] {
    const args = getArgsContent(macro);
    return args[args.length - 1] || [];
}

/** Split an argument at each `\and`, trimming the pieces. */
function splitOnAnd(content: Ast.Node[]): Ast.Node[][] {
    return splitOnMacro(content, "and").segments.map((segment) => {
        const piece = [...segment];
        trim(piece);
        return piece;
    });
}

/**
 * Remove beamer's `\inst{1,2}` affiliation markers from a name or institute,
 * returning the numbers they carried.
 */
function extractInstMarkers(nodes: Ast.Node[]): {
    content: Ast.Node[];
    insts: string[];
} {
    const insts: string[] = [];
    const content = nodes.filter((node) => {
        if (!match.macro(node, "inst")) {
            return true;
        }
        insts.push(
            ...printRaw(lastArgContent(node))
                .split(",")
                .map((n) => n.trim())
                .filter(Boolean)
        );
        return false;
    });
    trim(content);
    return { content, insts };
}

/**
 * `\thanks` is a footnote on the title page; `<personname>` has nowhere to
 * put it.
 */
function removeThanks(nodes: Ast.Node[], file: VFile): Ast.Node[] {
    const content = nodes.filter((node) => {
        if (!match.macro(node, "thanks")) {
            return true;
        }
        const message = new VFileMessage(
            `Warning: "\\thanks" has no equivalent in PreTeXt's bibinfo; it was dropped.`
        );
        file.message(message, message.place, "latex-to-pretext:warning");
        return false;
    });
    trim(content);
    return content;
}

function assignInstitutes(
    people: { info: AuthorInfo; insts: string[] }[],
    institutes: { content: Ast.Node[]; insts: string[] }[]
): void {
    if (institutes.length === 0) {
        return;
    }
    const byNumber = new Map<string, Ast.Node[]>();
    for (const institute of institutes) {
        for (const n of institute.insts) {
            byNumber.set(n, institute.content);
        }
    }
    people.forEach((person, i) => {
        if (person.info.institution) {
            return;
        }
        const institute =
            byNumber.size > 0
                ? person.insts.map((n) => byNumber.get(n)).find(Boolean)
                : institutes.length === 1
                  ? institutes[0].content
                  : institutes[i]?.content;
        if (institute && hasMeaningfulContent(institute)) {
            person.info.institution = institutionLines(institute);
        }
    });
}

/**
 * An institute written over several lines (`Dept.\\ University`) becomes
 * `<line>`s, which `<institution>` accepts in place of plain text.
 */
function institutionLines(content: Ast.Node[]): Ast.Node[] {
    const lines = splitOnMacro(content, "\\")
        .segments.map((segment) => {
            const line = [...segment];
            trim(line);
            return line;
        })
        .filter(hasMeaningfulContent);
    if (lines.length <= 1) {
        return lines[0] ?? [];
    }
    return lines.map((line) => htmlLike({ tag: "line", content: line }));
}

/**
 * Render each gathered author group as its own `<author>` tag, per the
 * PreTeXt schema (`<author><personname/><institution/><email/></author>`).
 */
export function renderCollectedAuthorInfo(authorList: AuthorInfo[]): Ast.Macro[] {
    return authorList.map((info) =>
        htmlLike({
            tag: "author",
            // The schema orders these, but a group's fields arrive in source
            // order (an `\institute` is assigned after every `\email`).
            content: Object.entries(info)
                .sort(([a], [b]) => fieldOrder(a) - fieldOrder(b))
                .map(([tag, content]) => htmlLike({ tag, content })),
        })
    );
}

const AUTHOR_FIELD_ORDER = ["personname", "institution", "email"];

function fieldOrder(tag: string): number {
    const index = AUTHOR_FIELD_ORDER.indexOf(tag);
    return index === -1 ? AUTHOR_FIELD_ORDER.length : index;
}

function createVFileMessage(node: Ast.Macro): VFileMessage {
    const message = new VFileMessage(
        `Macro \"${node.content}\" is not supported`
    );

    // add the position of the macro if available
    if (node.position) {
        message.line = node.position.start.line;
        message.column = node.position.start.column;
        message.place = {
            start: {
                line: node.position.start.line,
                column: node.position.start.column,
            },
            end: {
                line: node.position.end.line,
                column: node.position.end.column,
            },
        };
    }

    message.source = "latex-to-pretext:warning";
    return message;
}
