/**
 * Rus the files in `../../examples`. This test need not be in this directory, but it was a convenient place to put it (2024-02-19).
 */
import { describe, it, expect } from "vitest";
import util from "util";
import "../../test-common";
import { exec as _exec } from "node:child_process";
import * as path from "node:path";
import spawn from "cross-spawn";
import { glob } from "glob";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe(
    "unified-latex-doc-examples",
    () => {
        const examplesPath = path.resolve(__dirname, "../../../examples");
        const exampleFiles = glob.sync(`${examplesPath}/*.ts`);
        for (const exampleFile of exampleFiles) {
            it(`example ${exampleFile.split("/").pop()}`, async () => {
                const stdout = await executeCommand(`npx`, [
                    "vite-node",
                    exampleFile,
                ]);
                expect(stdout).toMatchSnapshot();
            });
        }
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
