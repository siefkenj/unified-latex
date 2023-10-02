// Modified from unified-args https://github.com/unifiedjs/unified-args/blob/main/lib/index.js
// MIT License

import table from "text-table";
import camelcase from "camelcase";
import minimist from "minimist";
import json5 from "json5";
import { fault } from "fault";
import { schema } from "./schema";
import type { Options as EngineOptions } from "unified-engine";
import type { Option } from "./schema";
import { PluggableList } from "unified";
import { availableLints } from "../lints";
import * as Ast from "@unified-latex/unified-latex-types";
import { parseMacroExpansion } from "../macros/parse-macro-expansion";

type RequiredEngineOptions = Required<
    Pick<
        EngineOptions,
        | "extensions"
        | "ignoreName"
        | "packageField"
        | "pluginPrefix"
        | "processor"
        | "rcName"
    >
>;

type ArgsOptionsFields = {
    /**
     * Name of executable
     */
    name: string;
    /**
     * description of executable
     */
    description: string;
    /**
     * Version (semver) of executable
     */
    version: string;
};

export type Options = RequiredEngineOptions &
    Pick<EngineOptions, "cwd"> &
    ArgsOptionsFields;

const own = {}.hasOwnProperty;

/**
 * Schema for `minimist`.
 */
const minischema = {
    unknown: handleUnknownArgument,
    default: {} as Record<string, string | boolean | null>,
    alias: {} as Record<string, string>,
    string: [] as string[],
    boolean: [] as string[],
};

let index = -1;
while (++index < schema.length) {
    addEach(schema[index]);
}

/**
 * Parse CLI options.
 */
export function options(flags: string[], configuration: Options) {
    const extension = configuration.extensions[0];
    const name = configuration.name;
    const config = toCamelCase(minimist(flags, minischema));
    let index = -1;

    while (++index < schema.length) {
        const option = schema[index];
        if (option.type === "string" && config[option.long] === "") {
            throw fault("Missing value:%s", inspect(option).join(" "));
        }
    }

    const ext = commaSeparated(config.ext as string | string[]);
    const report = reporter(config.report as string | string[]);
    const help = [
        inspectAll(schema),
        "",
        "Examples:",
        "",
        "  # Process `input." + extension + "`",
        "  $ " + name + " input." + extension + " -o output." + extension,
        "",
        "  # Pipe",
        "  $ " + name + " < input." + extension + " > output." + extension,
        "",
        "  # Rewrite all applicable files",
        "  $ " + name + " . -o",
        "",
        "  # Lint files and display the lint output (but not the processed file)",
        "  $ " + name + " . --lint-all --no-stdout",
    ].join("\n");

    const settings = parseSettings(config.setting as string);

    if (config.html && config.statsJson) {
        throw new Error(
            "Both --html and --stats-json were specified; only one may be used at a time."
        );
    }

    return {
        helpMessage: help,
        cwd: configuration.cwd,
        processor: configuration.processor,
        help: config.help,
        version: config.version,
        // XXX I have no idea why `minimist` is not assigning unknown arguments to "_"
        // but it appears unknown arguments are being assigned to "" instead...
        files: config._ || config[""],
        filePath: config.filePath,
        watch: config.watch,
        extensions: ext.length === 0 ? configuration.extensions : ext,
        output: config.output,
        out: config.stdout,
        tree: config.tree,
        treeIn: config.treeIn,
        treeOut: config.treeOut,
        inspect: config.inspect,
        rcName: configuration.rcName,
        packageField: configuration.packageField,
        rcPath: config.rcPath,
        detectConfig: config.config,
        settings,
        ignoreName: configuration.ignoreName,
        ignorePath: config.ignorePath,
        ignorePathResolveFrom: config.ignorePathResolveFrom,
        ignorePatterns: commaSeparated(config.ignorePattern as string),
        silentlyIgnore: config.silentlyIgnore,
        detectIgnore: config.ignore,
        pluginPrefix: configuration.pluginPrefix,
        plugins: [],
        lints: normalizeLints(config.lint as string | string[], config),
        reporter: report[0],
        reporterOptions: report[1],
        color: config.color,
        silent: config.silent,
        quiet: config.quiet,
        frail: config.frail,
        stats: config.stats,
        statsJson: config.statsJson,
        expandMacro: normalizeToArray(config.expandMacro as string).map(
            parseMacroExpansion
        ),
        expandDocumentMacro: normalizeToArray(
            config.expandDocumentMacro as string
        ),
        macro: normalizeToArray(config.macro as string).map(
            parseMacroExpansion
        ),
        html: config.html,
        markdown: config.markdown,
    } as EngineOptions & {
        help: boolean;
        helpMessage: string;
        watch: boolean;
        version: boolean;
        lints: Record<string, Record<string, unknown> | undefined>;
        plugins: PluggableList;
        stats: boolean;
        statsJson: boolean;
        expandMacro: { name: string; signature: string; body: Ast.Node[] }[];
        expandDocumentMacro: string[];
        macro: { name: string; signature: string }[];
        html: boolean;
        markdown: boolean;
    };
}

function addEach(option: Option) {
    const value = option.default;

    minischema.default[option.long] = value === undefined ? null : value;

    if (option.type && option.type in minischema) {
        minischema[option.type].push(option.long);
    }

    if (option.short) {
        minischema.alias[option.short] = option.long;
    }
}

/**
 * Parse `extensions`.
 */
function commaSeparated(value: string[] | string | null | undefined): string[] {
    return normalizeToArray(value).flatMap((d) => splitOnComma(d));
}

/**
 * Parse `plugins`.
 */
function plugins(value: string[] | string | null | undefined) {
    const normalized = normalizeToArray(value).map(splitOnEquals);
    let index = -1;
    const result: Record<string, Record<string, unknown> | undefined> = {};

    while (++index < normalized.length) {
        const value = normalized[index];
        result[value[0]] = value[1] ? parseConfig(value[1], {}) : undefined;
    }

    return result;
}

/**
 * Normalize the specified lints
 */
function normalizeLints(
    value: string[] | string | null | undefined,
    config: Record<"lintAll" | "fixAll", unknown>
) {
    const normalized = normalizeToArray(value).map(splitOnEquals);
    validateLintNames(normalized);
    if (config.lintAll) {
        normalized.push(...Object.keys(availableLints).map((v) => [v]));
    }

    const result: Record<string, Record<string, unknown> | undefined> =
        Object.fromEntries(
            normalized.map((value) => {
                let params = value[1] ? parseConfig(value[1], {}) : undefined;
                if (config.fixAll) {
                    if (params) {
                        Object.assign(params, { fix: true });
                    } else {
                        params = { fix: true };
                    }
                }
                return [value[0], params];
            })
        );

    return result;
}

/**
 * Parse `reporter`: only one is accepted.
 */
function reporter(value: string[] | string | null | undefined) {
    const all = normalizeToArray(value)
        .map(splitOnEquals)
        .map((value) => [
            value[0],
            value[1] ? parseConfig(value[1], {}) : undefined,
        ]);

    return all[all.length - 1] || [];
}

/**
 * Parse `settings`.
 */
function parseSettings(
    value: string[] | string | null | undefined
): Record<string, unknown> {
    const normalized = normalizeToArray(value);
    const cache: Record<string, unknown> = {};

    for (const value of normalized) {
        parseConfig(value, cache);
    }

    return cache;
}

/**
 * Parse configuration.
 */
function parseConfig(
    value: string,
    cache: Record<string, unknown>
): Record<string, unknown> {
    let flags: Record<string, unknown>;
    let flag: string;

    try {
        flags = toCamelCase(parseJSON(value));
    } catch (error) {
        const exception = error as Error;
        throw fault(
            "Cannot parse `%s` as JSON: %s",
            value,
            // Fix position
            exception.message.replace(/at(?= position)/, "around")
        );
    }

    for (flag in flags) {
        if (own.call(flags, flag)) {
            cache[flag] = flags[flag];
        }
    }

    return cache;
}
/**
 * Handle an unknown flag.
 */
function validateLintNames(lints: string[][]): boolean {
    for (const lint of lints) {
        const name = lint[0];
        if (!availableLints[name]) {
            const known = Object.keys(availableLints);
            throw fault(
                "Unknown lint rule `%s`, available rules are:\n%s",
                name,
                "\t" + known.join("\n\t")
            );
        }
    }

    return true;
}

/**
 * Handle an unknown flag.
 */
function handleUnknownArgument(flag: string): boolean {
    // Not a glob.
    if (flag.charAt(0) === "-") {
        // Long options, always unknown.
        if (flag.charAt(1) === "-") {
            throw fault(
                "Unknown option `%s`, expected:\n%s",
                flag,
                inspectAll(schema)
            );
        }

        // Short options, can be grouped.
        const found = flag.slice(1).split("");
        const known = schema.filter((d) => d.short);
        const knownKeys = new Set(known.map((d) => d.short));
        let index = -1;

        while (++index < found.length) {
            const key = found[index];
            if (!knownKeys.has(key)) {
                throw fault(
                    "Unknown short option `-%s`, expected:\n%s",
                    key,
                    inspectAll(known)
                );
            }
        }
    }

    return true;
}

/**
 * Inspect all `options`.
 */
function inspectAll(options: Option[]): string {
    return table(options.map((d) => inspect(d)));
}

/**
 * Inspect one `option`.
 */
function inspect(option: Option): string[] {
    let description = option.description;
    let long = option.long;

    if (option.default === true || option.truelike) {
        description += " (on by default)";
        long = "[no-]" + long;
    }

    return [
        "",
        option.short ? "-" + option.short : "",
        "--" + long + (option.value ? " " + option.value : ""),
        description,
    ];
}

/**
 * Normalize `value`.
 */
function normalizeToArray(
    value: string | string[] | null | undefined
): string[] {
    if (!value) {
        return [];
    }

    if (typeof value === "string") {
        return [value];
    }

    return value;
}

function splitOnEquals(value: string) {
    return value.split("=");
}

function splitOnComma(value: string) {
    return value.split(",");
}

/**
 * Transform the keys on an object to camel-case, recursively.
 */
function toCamelCase(object: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    let key: string;

    for (key in object) {
        if (own.call(object, key)) {
            let value = object[key];

            if (value && typeof value === "object" && !Array.isArray(value)) {
                // @ts-expect-error: looks like an object.
                value = toCamelCase(value);
            }

            result[camelcase(key)] = value;
        }
    }

    return result;
}

/**
 * Parse a (lazy?) JSON config.
 */
function parseJSON(value: string): Record<string, unknown> {
    return json5.parse("{" + value + "}");
}
