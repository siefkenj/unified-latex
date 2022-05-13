import esbuild from "esbuild";

// Automatically exclude all node_modules from the bundled version
import { nodeExternalsPlugin } from "esbuild-node-externals";

esbuild
    .build({
        entryPoints: ["./index.ts"],
        outfile: "./dist/index.js",
        bundle: true,
        minify: false,
        sourcemap: true,
        format: "esm",
        target: "node14",
        plugins: [nodeExternalsPlugin()],
    })
    .catch(() => process.exit(1));
