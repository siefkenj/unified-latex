import { describe, it, expect } from "vitest";
import util from "util";
import "../../test-common";
import { exec as _exec } from "node:child_process";
import * as fsLegacy from "node:fs";
import * as path from "node:path";
import spawn from "cross-spawn";

const exec = util.promisify(_exec);

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const exePath = path.resolve(__dirname, "../dist/unified-latex-cli.mjs");
const examplesPath = path.resolve(__dirname, "examples");

async function execCLI(args: string[]) {
    return await executeCommand(`node`, [
        // package.json points to typescript sources and it is replaced with the build output
        // before publishing by scripts/make-package.mjs. In testing, we need to point to the
        // build output explicitly by passing the conditions flag.
        `-C`,
        `prebuilt`,
        exePath,
        ...args,
    ]);
}

describe(
    "unified-latex-cli",
    () => {
        it("executable exists", async () => {
            expect(fsLegacy.existsSync(exePath)).toBeTruthy();
        });
        it("can execute without error", async () => {
            const stdout = await execCLI(["-h"]);
            expect(stdout).toBeTruthy();
        });
        it("can format document", async () => {
            const stdout = await execCLI([`${examplesPath}/needs-fixing.tex`]);
            expect(stdout).toMatchSnapshot();
        });
        it("can expand macro", async () => {
            {
                const stdout = await execCLI([
                    `${examplesPath}/needs-expanding.tex`,
                    `-e`,
                    "\\newcommand{foo}[1]{FOO(#1)}",
                    `-e`,
                    '{name: "bar", body: "baz"}',
                ]);
                expect(stdout).toMatchSnapshot();
            }
            {
                // Make sure we don't lose spaces in math mode
                const stdout = await execCLI([
                    `${examplesPath}/needs-expanding.tex`,
                    `-e`,
                    "\\newcommand{foo}[1]{$\\x #1$}",
                    `-e`,
                    '{name: "bar", body: "baz"}',
                ]);
                expect(stdout).toMatchSnapshot();
            }
            {
                let stdout = await executeCommand(`node`, [
                    exePath,
                    `${examplesPath}/needs-expanding.tex`,
                    `-e`,
                    "\\newcommand{foo}[2][FOO]{#1(#2)}",
                    `-e`,
                    '{name: "bar", signature: "O{baz}", body: "#1"}',
                ]);
                expect(stdout).toMatchSnapshot();
            }
        });
        it("can expand macros defined in document", async () => {
            const stdout = await execCLI([
                `${examplesPath}/has-definition.tex`,
                `--stats-json`,
            ]);
            const { newcommands } = JSON.parse(stdout) as {
                newcommands: { name: string }[];
            };
            const newcommandNames = newcommands.map((c) => c.name);
            expect(newcommandNames).toEqual(["foo", "baz"]);

            {
                const stdout = await execCLI([
                    `${examplesPath}/has-definition.tex`,
                    `--expand-document-macro`,
                    `foo`,
                    `--expand-document-macro`,
                    `baz`,
                ]);
                expect(stdout).toMatchSnapshot();
            }
        });
        it("can override default macros", async () => {
            {
                const stdout = await execCLI([
                    `${examplesPath}/has-existing-definition.tex`,
                ]);
                expect(stdout).toMatchSnapshot();
            }
            {
                const stdout = await execCLI([
                    `${examplesPath}/has-existing-definition.tex`,
                    `-e`,
                    "\\newcommand{mathbb}{\\mathbb}",
                ]);
                expect(stdout).toMatchSnapshot();
            }
            {
                const stdout = await execCLI([
                    `${examplesPath}/has-existing-definition.tex`,
                    `-e`,
                    "\\newcommand{mathbb}[2]{\\mathbb{#1}{#2}}",
                ]);
                expect(stdout).toMatchSnapshot();
            }
        });
        it("can convert to html", async () => {
            {
                const stdout = await execCLI([
                    `${examplesPath}/simple.tex`,
                    `--html`,
                ]);
                expect(stdout).toMatchSnapshot();
            }
        });
        it("can convert to markdown", async () => {
            {
                const stdout = await execCLI([
                    `${examplesPath}/simple.tex`,
                    `--markdown`,
                ]);
                expect(stdout).toMatchSnapshot();
            }
        });
    },
    {
        timeout: 60 * 1000,
    }
);

/**
 * Run commands with arguments using "cross-spawn", which correctly escapes arguments
 * so that end results are the same across different shells.
 */
function executeCommand(
    executablePath: string,
    args: string[]
): Promise<string> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(executablePath, args, { stdio: "pipe" });

        let stdoutData = "";

        childProcess.stdout!.on("data", (data) => {
            stdoutData += data.toString();
        });

        childProcess.on("error", (err) => {
            reject(err);
        });

        childProcess.on("close", (code) => {
            if (code === 0) {
                resolve(stdoutData);
            } else {
                reject(new Error(`Child process exited with code ${code}`));
            }
        });
    });
}
