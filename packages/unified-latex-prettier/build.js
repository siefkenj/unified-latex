import esbuild from "esbuild";
import fs from "node:fs/promises";
import { isCjsPackage } from "../../scripts/esbuild-module-check.mjs";
import { packageReadmeAndPackageJson } from "../../scripts/vite-plugins";

(async () => {
    const packageJson = JSON.parse(
        await fs.readFile(new URL("./package.json", import.meta.url))
    );

    // We want to externalize modules that are explicitly installed as a dependency
    const explicitDeps = Object.keys(packageJson.dependencies || {}).filter(
        // We actually want to compile prettier in because prettier doesn't work with es-modules
        // yet, and we want to be able to import as an esm.
        (d) => d !== "prettier"
    );

    const commonConfig = {
        entryPoints: ["./index.ts"],
        outfile: "./dist/index.js",
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
            external: commonConfig.external.filter(isCjsPackage),
            outfile: "./dist/index.cjs",
            format: "cjs",
        })
        .catch(() => process.exit(1));
})();
