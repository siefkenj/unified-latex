// Modified from unified-args https://github.com/unifiedjs/unified-args/blob/main/lib/index.js
// MIT License

import process from "node:process";
import stream from "node:stream";
import chalk from "chalk";
import chokidar, { FSWatcher } from "chokidar";
import {
    engine,
    Callback as EngineCallback,
    Context as EngineContext,
} from "unified-engine";
import { unifiedLatexToHast } from "@unified-latex/unified-latex-to-hast";
import { options, Options } from "./options";
import { availableLints } from "../lints";
import { statsJsonPlugin, statsPlugin } from "../stats";
import { expandMacrosPlugin } from "../macros/expand-macros-plugin";
import { attachMacroArgsPlugin } from "../macros/attach-macro-args-plugin";
import { prettyPrintHtmlPlugin } from "../html/format";
import { expandDocumentMacrosPlugin } from "../macros/expand-document-macros-plugin";

// Fake TTY stream.
const ttyStream = Object.assign(new stream.Readable(), { isTTY: true });

// Exit, lazily, with the correct exit status code.
let exitStatus = 0;

process.on("exit", onexit);

// Handle uncaught errors, such as from unexpected async behavior.
process.on("uncaughtException", fail);

/**
 * Start the CLI.
 *
 * @param {Options} cliConfig
 */
export function unifiedArgs(cliConfig: Options) {
    let config: ReturnType<typeof options>;
    let watcher: FSWatcher | undefined;
    let output: boolean | string | undefined;

    try {
        config = options(process.argv.slice(2), cliConfig);
    } catch (error) {
        const exception = error as Error;
        return fail(exception, true);
    }

    if (config.help) {
        process.stdout.write(
            [
                "Usage: " + cliConfig.name + " [options] [path | glob ...]",
                "",
                "  " + cliConfig.description,
                "",
                "Options:",
                "",
                config.helpMessage,
                "",
            ].join("\n"),
            noop
        );

        return;
    }

    if (config.version) {
        process.stdout.write(cliConfig.version + "\n", noop);

        return;
    }

    // Modify `config` for watching.
    if (config.watch) {
        output = config.output;

        // Do not read from stdin(4).
        config.streamIn = ttyStream;

        // Do not write to stdout(4).
        config.out = false;

        process.stderr.write(
            chalk.bold("Watching...") + " (press CTRL+C to exit)\n",
            noop
        );

        // Prevent infinite loop if set to regeneration.
        if (output === true) {
            config.output = false;

            process.stderr.write(
                chalk.yellow("Note") + ": Ignoring `--output` until exit.\n",
                noop
            );
        }
    }

    if (config.lints) {
        for (const [lintName, lintArgs] of Object.entries(config.lints)) {
            const lint = availableLints[lintName];
            if (!lint) {
                throw new Error(
                    `Could not find lint named "${lintName}"; available lints are ${Object.keys(
                        availableLints
                    ).join(", ")}`
                );
            }
            config.plugins.push([lint, lintArgs]);
        }
    }

    if (config.stats) {
        config.plugins.push([statsPlugin]);
    }

    if (config.macro.length > 0) {
        config.plugins.push([attachMacroArgsPlugin, { macros: config.macro }]);
    }

    if (config.expandMacro.length > 0) {
        config.plugins.push([
            expandMacrosPlugin,
            { macros: config.expandMacro },
        ]);
    }

    if (config.expandDocumentMacro.length > 0) {
        config.plugins.push([
            expandDocumentMacrosPlugin,
            { macros: config.expandDocumentMacro },
        ]);
    }

    if (config.statsJson) {
        config.plugins.push([statsJsonPlugin]);
    }

    if (config.html) {
        config.plugins.push([unifiedLatexToHast]);
        config.plugins.push([prettyPrintHtmlPlugin]);
    }

    /**
     * Handle complete run.
     *
     * @type {EngineCallback}
     */
    const done: EngineCallback = function done(error, code, context) {
        if (error) {
            clean();
            fail(error);
        } else {
            exitStatus = code || 0;

            if (config.watch && !watcher && context) {
                subscribe(context);
            }
        }
    };

    // Clean the watcher.
    function clean() {
        if (watcher) {
            watcher.close();
            watcher = undefined;
        }
    }

    /**
     * Subscribe a chokidar watcher to all processed files.
     */
    function subscribe(context: EngineContext) {
        watcher = chokidar
            .watch(context.fileSet?.origins || [], {
                cwd: config.cwd,
                ignoreInitial: true,
            })
            .on("error", done)
            .on("change", (filePath) => {
                config.files = [filePath];
                engine(config, done);
            });

        process.on("SIGINT", onsigint);

        /**
         * Handle a SIGINT.
         */
        function onsigint() {
            // Hide the `^C` in terminal.
            process.stderr.write("\n", noop);

            clean();

            // Do another process if `output` specified regeneration.
            if (output === true) {
                config.output = output;
                config.watch = false;
                engine(config, done);
            }
        }
    }

    // Initial run.
    engine(config, done);
}

/**
 * Print an error, optionally with stack.
 *
 * @param {Error} error
 * @param {boolean} [pretty=false]
 */
function fail(error: Error, pretty?: boolean) {
    const message = String((pretty ? error : error.stack) || error);

    exitStatus = 1;

    process.stderr.write(message.trim() + "\n", noop);
}

function onexit() {
    process.exit(exitStatus);
}

function noop() {}
