// Loop through all files in ./packages/* via a glob pattern and write to their package.json file
import glob from "glob";
import * as fs from "node:fs/promises";
import path from "path";
import { promisify } from "util";

async function main() {
    const packageBasePaths = glob.sync("../packages/*");
    for (const pkgJsonPath of packageBasePaths.map((p) =>
        path.join(p, "package.json")
    )) {
        try {
            const pkgJson = await fs.readFile(pkgJsonPath, "utf8");
            const pkg = JSON.parse(pkgJson);

            if (pkg.wireit) {
                console.log("skipping", pkgJsonPath);
                continue;
            }

            pkg.wireit = {
                compile: {
                    dependencies: ["compile:types", "compile:js"],
                    files: ["src/**/*.ts", "tsconfig.json"],
                },
            };

            Object.assign(pkg.scripts, {
                compile: "wireit",
                "compile:types": "tsc -b tsconfig.json",
                "compile:js": "node build.js",
            });

            // sort the keys of pkg.scripts alphabetically
            pkg.scripts = Object.fromEntries(
                Object.entries(pkg.scripts).sort()
            );

            console.log(pkgJsonPath);
            //console.log("NEW JSON\n", JSON.stringify(pkg, null, 2));
            await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2));
        } catch (e) {
            console.log(e);
        }
    }
}

main();
