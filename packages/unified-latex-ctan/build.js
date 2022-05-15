import esbuild from "esbuild";
import fs from "node:fs/promises";
import glob from "glob";

// Automatically exclude all node_modules from the bundled version
import { nodeExternalsPlugin } from "esbuild-node-externals";

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
        plugins: [nodeExternalsPlugin()],
        external: [...explicitDeps],
    };

    // Build the ESM
    esbuild.build(commonConfig).catch(() => process.exit(1));

    // Build a CommonJS version as well
    esbuild
        .build({
            ...commonConfig,
            format: "cjs",
            outExtension: { ".js": ".cjs" },
        })
        .catch(() => process.exit(1));
})();
