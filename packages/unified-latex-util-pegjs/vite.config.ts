import { LibraryOptions, Plugin, PluginOption, defineConfig } from "vite";
import dts from "vite-plugin-dts";
import fs from "node:fs/promises";
import path from "node:path";
import peg from "peggy";
import * as esbuild from "esbuild";
import { isCjsPackage } from "../../scripts/esbuild-module-check.mjs";
import { packageReadmeAndPackageJson } from "../../scripts/vite-plugins";

// Any dependencies we have listed in package.json will be externalized
import packageJson from "./package.json";
const explicitDeps = Object.keys(packageJson.dependencies || {});

export default defineConfig(({ mode }) => {
    const formats: LibraryOptions["formats"] =
        mode === "commonjs" ? ["cjs"] : ["es"];
    const externalList =
        mode === "commonjs" ? explicitDeps.filter(isCjsPackage) : explicitDeps;

    const plugins =
        mode === "commonjs"
            ? []
            : [dts({ rollupTypes: true }), packageReadmeAndPackageJson()];
    console.log(`Building in mode: ${mode}.\n`);

    return {
        plugins: [...plugins, pegjsLoader()],
        build: {
            emptyOutDir: false,
            minify: false,
            sourcemap: true,
            outDir: "dist",
            lib: {
                entry: "index.ts",
                fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
                formats,
            },
            rollupOptions: {
                external: (id) =>
                    externalList.some((dep) => id.startsWith(dep)),
            },
        },
    };
});

/**
 * Plugin to allow importing peggy/pegjs files directly.
 */
function pegjsLoader(options = {}): PluginOption {
    const svgRegex = /\.peg(js|gy)$/;

    const ret: Plugin = {
        name: "pegjs-loader",
        enforce: "pre",

        async load(filePath) {
            if (!filePath.match(svgRegex)) {
                return;
            }
            const source = await fs.readFile(filePath, "utf-8");
            const filename = path.relative(process.cwd(), filePath);

            const defaultOptions: Record<string, any> = {
                output: "source",
                format: "bare",
                ...options,
            };
            if (filename.match(/latex\.(pegjs|peggy)$/)) {
                defaultOptions.allowedStartRules = ["document", "math"];
                // Avoid slow parsing as in https://github.com/siefkenj/unified-latex/issues/47
                // and https://github.com/siefkenj/unified-latex/issues/115
                defaultOptions.cache = true;
            }
            if (filename.match(/tikz\.(pegjs|peggy)$/)) {
                defaultOptions.allowedStartRules = [
                    "path_spec",
                    "foreach_body",
                ];
            }

            const contents = peg.generate(source, defaultOptions);
            // contents might have some typescript in it, so we transpile the typescript
            // away with esbuild.
            const { code } = await esbuild.transform(
                `export default ${contents}`,
                { loader: "ts" }
            );
            return { code };
        },
    };
    return ret;
}
