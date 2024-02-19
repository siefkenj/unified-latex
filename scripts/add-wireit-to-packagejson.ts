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

            if (!pkg.wireit) {
                console.log("skipping", pkgJsonPath);
                continue;
            }

            pkg.wireit["compile:cjs"].output = ["dist/**/*.cjs*"];
            pkg.wireit["compile:cjs"].dependencies = ["deps"];
            pkg.wireit["compile:esm"].output = [
                "dist/**/*.js*",
                "dist/**/*.json",
                "dist/**/*.d.ts",
                "dist/**/*.md",
            ];
            pkg.wireit["compile:esm"].dependencies = ["deps"];

            // Compute the dependencies. They are all the `@unified-latex/*` packages
            const dependencies = (Object.keys(pkg.dependencies) as string[])
                .map((s) =>
                    s.startsWith("@unified-latex/")
                        ? s.replace("@unified-latex/", "")
                        : null
                )
                .filter((s) => s !== null)
                .map((s) => `../${s}:compile`);
            pkg.wireit.deps = { dependencies };

            //pkg.wireit = {
            //    compile: {
            //        dependencies: ["compile:cjs", "compile:esm"],
            //    },
            //    "compile:cjs": {
            //        command: "vite build --mode commonjs",
            //        files: [
            //            "index.ts",
            //            "libs/**/*.ts",
            //            "libs/**/*.json",
            //            "tsconfig.json",
            //            "vite.config.ts",
            //        ],
            //        output: ["dist/**/*.cjs"],
            //    },
            //    "compile:esm": {
            //        command: "vite build",
            //        files: [
            //            "index.ts",
            //            "libs/**/*.ts",
            //            "libs/**/*.json",
            //            "tsconfig.json",
            //            "vite.config.ts",
            //        ],
            //        output: ["dist/**/*.js", "dist/**/*.json"],
            //    },
            //};

            Object.assign(pkg.scripts, {
                compile: "wireit",
                "compile:cjs": "wireit",
                "compile:esm": "wireit",
            });
            delete pkg.scripts["compile:tsc"];
            delete pkg.scripts["compile:esm_and_cjs"];

            // sort the keys of pkg.scripts alphabetically
            pkg.scripts = Object.fromEntries(
                Object.entries(pkg.scripts).sort()
            );

            console.log(pkgJsonPath);
            //console.log("NEW JSON\n", JSON.stringify(pkg, null, 4));
            await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 4));
        } catch (e) {
            console.log(e);
        }
    }
}

main();
