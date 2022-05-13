import * as XColorSpec from "./types";

/**
 * Print an `xcolor` argument specification AST to a string.
 */
export function printRaw(node: XColorSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    if (node.type === "invalid_spec") {
        return node.content;
    }

    switch (node.type) {
        case "postfix":
            if (node.plusses != null) {
                return `!!${node.plusses}`;
            } else {
                return `!![${node.num}]`;
            }
        case "complete_mix":
            return `!${node.mix_percent}!${node.name}`;
        case "partial_mix":
            return `!${node.mix_percent}`;
        case "expr":
            return `${node.prefix || ""}${node.name}${node.mix_expr
                .map((mix) => printRaw(mix))
                .join("")}${node.postfix ? printRaw(node.postfix) : ""}`;
        case "weighted_expr":
            return `${printRaw(node.color)},${node.weight}`;
        case "extended_expr":
            let prefix = node.core_model;
            if (node.div) {
                prefix += `,${node.div}`;
            }
            return `${prefix}:${node.expressions
                .map((expr) => printRaw(expr))
                .join(";")}`;
        case "function":
            return `>${node.name},${node.args.map((a) => "" + a).join(",")}`;
        case "color":
            return (
                printRaw(node.color) +
                node.functions.map((f) => printRaw(f)).join("")
            );

        default:
            console.warn(
                `Unknown node type "${(node as any).type}" for node`,
                node
            );
            return "";
    }
}
