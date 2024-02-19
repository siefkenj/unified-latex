import glob from "glob";
import fs from "fs";
import shell from "shelljs";

const folders = glob.sync("../packages/*/dist/");

shell.exec("rm -rf dist");
shell.exec("mkdir -p dist");

for (const folder of folders) {
    const packageJson = JSON.parse(
        fs.readFileSync(`${folder}/package.json`, "utf-8")
    );
    const packageName = packageJson.name.replace(/^@[^/]+\//, "");
    console.log(`Making package for ${packageName}`);
    shell.exec(
        `cd ${folder} && npm pack && mv *.tgz ../../../test/dist/${packageName}.tgz`
    );
}
