import { LibraryOptions, defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { builtinModules } from "module";
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
    // We're building the CLI specifically for Node.js, so we externalize all built-in modules no matter what
    externalList.push("node:", ...builtinModules);
    const plugins =
        mode === "commonjs"
            ? []
            : [dts({ rollupTypes: true }), packageReadmeAndPackageJson()];

    console.log(`Building in mode: ${mode}.\n`);

    return {
        plugins,
        build: {
            target: "node16",
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
