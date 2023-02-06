import esbuild from "esbuild";
import fs from "node:fs/promises";

(async () => {
    const packageJson = JSON.parse(
        await fs.readFile(new URL("./package.json", import.meta.url))
    );

    // We want to externalize modules that are explicitly installed as a dependency
    const explicitDeps = Object.keys(packageJson.dependencies || {}).concat([
        "node:stream",
        "node:process",
        "node:fs",
    ]);

    const commonConfig = {
        entryPoints: ["./index.ts"],
        outfile: "./dist/index.js",
        bundle: true,
        minify: false,
        sourcemap: true,
        format: "esm",
        target: "node14",
        platform: "node",
        external: [...explicitDeps],
    };

    // Build the ESM
    esbuild.build(commonConfig).catch(() => process.exit(1));

    // Build a CommonJS version as well
    esbuild
        .build({
            ...commonConfig,
            outfile: "./dist/index.cjs",
            format: "cjs",
        })
        .catch(() => process.exit(1));

    // Build a standalone version as well
    esbuild
        .build({
            ...commonConfig,
            outfile: "./dist/unified-latex-cli.mjs",
            format: "esm",
            banner: {
                js: "#!/usr/bin/env node\n",
            },
        })
        .catch(() => process.exit(1));
})();
