// Modified from unified-args https://github.com/unifiedjs/unified-args/blob/main/lib/index.js
// MIT License

import { availableLints } from "../lints";

export type Option = {
    long: string;
    description: string;
    value?: string;
    short?: string;
    default?: string | boolean;
    truelike?: boolean;
    type?: "boolean" | "string";
};

export const schema: Option[] = [
    {
        long: "help",
        description: "Output usage information",
        short: "h",
        type: "boolean",
        default: false,
    },
    {
        long: "version",
        description: "Output version number",
        short: "v",
        type: "boolean",
        default: false,
    },
    {
        long: "output",
        description: "Specify output location",
        short: "o",
        value: "[path]",
    },
    {
        long: "rc-path",
        description: "Specify configuration file",
        short: "r",
        type: "string",
        value: "<path>",
    },
    {
        long: "ignore-path",
        description: "Specify ignore file",
        short: "i",
        type: "string",
        value: "<path>",
    },
    {
        long: "ext",
        description: "Specify extensions",
        type: "string",
        value: "<extensions>",
    },
    {
        long: "lint",
        description: `Lint rules to apply. Use multiple times to specify multiple lints. Available rules: ${Object.keys(
            availableLints
        ).join(", ")}`,
        short: "l",
        type: "string",
        value: "<rule>",
    },
    {
        long: "lint-all",
        description: `Apply all available lint rules`,
        type: "boolean",
        default: false,
    },
    {
        long: "fix-all",
        description: "Apply fixes for all applied lints",
        type: "boolean",
        default: false,
    },
    {
        long: "watch",
        description: "Watch for changes and reprocess",
        short: "w",
        type: "boolean",
        default: false,
    },
    {
        long: "macro",
        description:
            "Attach arguments of the specified macro (by default, unrecognized macros are parsed as having no arguments). Accepts a string of the form `\\newcommand{<name>}[<num args>]{<body>}` or a JSON string `{name: <name>, signature: <xparse argument signature>, body: <macro body>}`",
        short: "m",
        type: "string",
        value: "<rule>",
    },
    {
        long: "expand-macro",
        description:
            "Expand the specified macro. Accepts a string of the form `\\newcommand{<name>}[<num args>]{<body>}` or a JSON string `{name: <name>, signature: <xparse argument signature>, body: <macro body>}`",
        short: "e",
        type: "string",
        value: "<rule>",
    },
    {
        long: "expand-document-macro",
        description:
            "Expand the specified macro which is defined in the document. You can use --stats to list all macros defined in the document.",
        short: "d",
        type: "string",
        value: "<name>"
    },
    {
        long: "frail",
        description: "Exit with 1 on warnings",
        type: "boolean",
        default: false,
    },
    {
        long: "tree",
        description: "Specify input and output as syntax tree",
        type: "boolean",
        default: false,
    },
    {
        long: "report",
        description: "Specify reporter",
        type: "string",
        value: "<reporter>",
    },
    {
        long: "file-path",
        description: "Specify path to process as",
        type: "string",
        value: "<path>",
    },
    {
        long: "ignore-path-resolve-from",
        description:
            "Resolve patterns in `ignore-path` from its directory or cwd",
        type: "string",
        value: "dir|cwd",
        default: "dir",
    },
    {
        long: "ignore-pattern",
        description: "Specify ignore patterns",
        type: "string",
        value: "<globs>",
    },
    {
        long: "silently-ignore",
        description: "Do not fail when given ignored files",
        type: "boolean",
    },
    {
        long: "tree-in",
        description: "Specify input as syntax tree",
        type: "boolean",
    },
    {
        long: "tree-out",
        description: "Output syntax tree",
        type: "boolean",
    },
    {
        long: "inspect",
        description: "Output formatted syntax tree",
        type: "boolean",
    },
    {
        long: "stats",
        description: "Show information about the processed file",
        type: "boolean",
        default: false,
    },
    {
        long: "stats-json",
        description:
            "Show information about the processed file and output the information as JSON",
        type: "boolean",
        default: false,
    },
    {
        long: "html",
        description:
            "Convert the output to HTML. Note, for math to render properly, you will need to add a library like MathJax or KaTeX to your HTMl source; you should also expand/replace any macros not recognized by the converter",
        type: "boolean",
        default: false,
    },
    {
        long: "markdown",
        description:
            "Convert the output to Markdown. Markdown output uses Github-flavored Markdown to support math",
        type: "boolean",
        default: false,
    },
    {
        long: "stdout",
        description: "[Don't] write the processed file's contents to stdout",
        type: "boolean",
        truelike: true,
    },
    {
        long: "color",
        description: "Specify color in report",
        type: "boolean",
        default: true,
    },
    {
        long: "config",
        description: "Search for configuration files",
        type: "boolean",
        default: true,
    },
    {
        long: "ignore",
        description: "Search for ignore files",
        type: "boolean",
        default: true,
    },
];
