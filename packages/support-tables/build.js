import esbuild from "esbuild";
import fs from "node:fs/promises";

(async () => {
    const packageJson = JSON.parse(
        await fs.readFile(new URL("./package.json", import.meta.url))
    );

    // We want to externalize modules that are explicitly installed as a dependency
    const explicitDeps = Object.keys(packageJson.dependencies || {});

    const commonConfig = {
        entryPoints: ["./katex-support.ts", "./ligature-macros.ts"],
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
            external: commonConfig.external.filter(dep => !new RegExp(packageJson.internalDependencies).exec(dep)),
            format: "cjs",
            outExtension: { ".js": ".cjs" },
        })
        .catch(() => process.exit(1));
})();
