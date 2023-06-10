import esbuild from "esbuild";
import fs from "node:fs/promises";
import glob from "glob";
import { COMPILE_PKG_REGEXP } from "../unified-latex/build.js";

(async () => {
    const packageJson = JSON.parse(
        await fs.readFile(new URL("./package.json", import.meta.url))
    );

    // We want to externalize modules that are explicitly installed as a dependency
    const explicitDeps = Object.keys(packageJson.dependencies || {});

    // We want to build files for all the packages as well.
    const packageEntries = glob.sync("./package/*/index.ts");

    const commonConfig = {
        entryPoints: ["./index.ts", ...packageEntries],
        outdir: "dist",
        bundle: true,
        minify: false,
        sourcemap: true,
        format: "esm",
        target: "node14",
        external: [...explicitDeps],
    };

    // Build the ESM
    esbuild.build(commonConfig).catch(() => process.exit(1));

    // Build a CommonJS version as well
    esbuild
        .build({
            ...commonConfig,
            external: commonConfig.external.filter(dep => !COMPILE_PKG_REGEXP.exec(dep)),
            format: "cjs",
            outExtension: { ".js": ".cjs" },
        })
        .catch(() => process.exit(1));
})();
