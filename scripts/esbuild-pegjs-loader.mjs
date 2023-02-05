import fs from "node:fs/promises";
import path from "node:path";
import peg from "peggy";

const convertMessage = ({ message, location, code, filename }) => {
    location = {
        file: filename,
        line: location.start.line - 1,
        column: location.start.column,
        length: location.end.offset - location.start.offset,
        lineText: code,
    };
    return { text: message, location };
};

/**
 * `esbuild` plugin to load .pegjs files. If the file ends in `latex.pegjs`,
 * entry points of "document" and "math" are automatically inserted.
 */
export const pegjsLoader = (options = {}) => ({
    name: "pegjs-loader",
    setup(build) {
        build.onLoad({ filter: /.\.(pegjs|peggy)$/ }, async (args) => {
            const source = await fs.readFile(args.path, "utf-8");
            const filename = path.relative(process.cwd(), args.path);

            const defaultOptions = {
                output: "source",
                format: "bare",
                ...options,
            };
            if (filename.match(/latex\.(pegjs|peggy)$/)) {
                defaultOptions.allowedStartRules = ["document", "math"];
            }
            if (filename.match(/tikz\.(pegjs|peggy)$/)) {
                defaultOptions.allowedStartRules = ["path_spec", "foreach_body"];
            }

            try {
                const contents = peg.generate(source, defaultOptions);
                return {
                    contents: `export default ${contents}`,
                };
            } catch (e) {
                const code = source
                    .split("\n")
                    .slice(e.location.start.line - 2, e.location.start.line - 1)
                    .join("\n");
                return {
                    errors: [
                        convertMessage({
                            message: e.message,
                            location: e.location,
                            code,
                            filename,
                        }),
                    ],
                };
            }
        });
    },
});
