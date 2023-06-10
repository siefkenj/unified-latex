import esbuild from "esbuild";
import fs from "node:fs/promises";

export const COMPILE_PKG_REGEXP = /unified|bail|is-plain-obj|trough|vfile.*|unist.*|hast.*|property-information|html-void-elements|.*-separated-tokens|.*entities.*|ccount|rehype*|string-width|strip-ansi|ansi-regex|supports-color|rehype|web-namespaces|zwitch/;

(async () => {
    const packageJson = JSON.parse(
        await fs.readFile(new URL("./package.json", import.meta.url))
    );

    // We want to externalize modules that are explicitly installed as a dependency
    const explicitDeps = Object.keys(packageJson.dependencies || {});

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
            external: commonConfig.external.filter(dep => !COMPILE_PKG_REGEXP.exec(dep)),
            outfile: "./dist/index.cjs",
            format: "cjs",
        })
        .catch(() => process.exit(1));
})();
