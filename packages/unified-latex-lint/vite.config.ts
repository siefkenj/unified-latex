import { LibraryOptions, defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { glob } from "glob";
import path from "node:path";
import { isCjsPackage } from "../../scripts/esbuild-module-check.mjs";
import { packageReadmeAndPackageJson } from "../../scripts/vite-plugins";

const __dirname = new URL(".", import.meta.url).pathname;

// Any dependencies we have listed in package.json will be externalized
import packageJson from "./package.json";
const explicitDeps = Object.keys(packageJson.dependencies || {});

export default defineConfig(({ mode }) => {
    /**
     * Make a typescript file end in .js
     */
    function makeFileJs(name: string) {
        return name.replace(/\.ts$/, mode === "commonjs" ? ".cjs" : ".js");
    }

    const formats: LibraryOptions["formats"] =
        mode === "commonjs" ? ["cjs"] : ["es"];
    const externalList =
        mode === "commonjs" ? explicitDeps.filter(isCjsPackage) : explicitDeps;

    const plugins =
        mode === "commonjs"
            ? []
            : [dts({ rollupTypes: false }), packageReadmeAndPackageJson()];

    // We want to build files for all the packages as well.
    const packageEntries = glob.sync("./rules/*/index.ts");

    console.log(`Building in mode: ${mode}.\n`);

    return {
        plugins,
        build: {
            emptyOutDir: false,
            minify: false,
            sourcemap: true,
            outDir: "dist",
            lib: {
                entry: ["index.ts", ...packageEntries],
                formats,
            },
            rollupOptions: {
                external: (id) =>
                    externalList.some((dep) => id.startsWith(dep)),
                output: {
                    // There's no direct option to output entries to the file where they're from,
                    // so we manually compute the file path/name.
                    entryFileNames: (chunkInfo) => {
                        const relPath = path.relative(
                            __dirname,
                            chunkInfo.facadeModuleId || ""
                        );
                        const fileName = makeFileJs(relPath);
                        return fileName;
                    },
                },
            },
        },
    };
});
