import { Root } from "hastscript/lib/core";
import rehypeStringify from "rehype-stringify";
import Prettier from "prettier";
import { Plugin, unified } from "unified";

/**
 * Plugin that pretty-prints HTML.
 */
export const prettyPrintHtmlPlugin: Plugin<void[], Root, string> = function () {
    const processor = unified().use(rehypeStringify);
    this.Compiler = (tree, file) => {
        file.extname = ".html";

        const html = processor.stringify(tree, file);
        try {
            return Prettier.format(html, { parser: "html", useTabs: true });
        } catch {}
        return html;
    };
};
