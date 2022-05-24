import util from "util";
import "../../test-common";
import { exec as _exec } from "node:child_process";
import * as fsLegacy from "node:fs";
import * as path from "node:path";

const exec = util.promisify(_exec);

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const exePath = path.resolve(__dirname, "../dist/unified-latex-cli.mjs");
const examplesPath = path.resolve(__dirname, "examples");

describe("unified-latex-cli", () => {
    let stdout: string, stderr: string;
    it("executable exists", async () => {
        expect(fsLegacy.existsSync(exePath)).toBeTruthy();
    });
    it("can execute without error", async () => {
        let { stdout, stderr } = await exec(`node ${exePath} -h`);
        expect(stdout).toBeTruthy();
    });
    it("can format document", async () => {
        let { stdout, stderr } = await exec(
            `node ${exePath} ${examplesPath}/needs-fixing.tex`
        );
        expect(stdout).toMatchSnapshot();
    });
    it("can expand macro", async () => {
        let { stdout, stderr } = await exec(
            `node ${exePath} ${examplesPath}/needs-expanding.tex -e '\\newcommand{foo}[1]{FOO(#1)}' -e '{name: "bar", body: "baz"}'`
        );
        expect(stdout).toMatchSnapshot();
    });
});
