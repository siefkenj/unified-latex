import { LibraryOptions, defineConfig } from "vite";
import dts from "vite-plugin-dts";
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
        plugins,
        build: {
            emptyOutDir: false,
            minify: false,
            sourcemap: true,
            outDir: "dist",
            lib: {
                entry: ["./katex-support.ts", "./ligature-macros.ts"],
                formats,
            },
            rollupOptions: {
                external: (id) =>
                    externalList.some((dep) => id.startsWith(dep)),
            },
        },
    };
});
