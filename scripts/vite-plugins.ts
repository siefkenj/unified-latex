import { viteStaticCopy } from "vite-plugin-static-copy";
import { packageJsonDist } from "./package-json-dist.mjs";

/**
 * A vite plugin that copies over the `README.md` and the `package.json` file into the `dist` directory.
 * The `package.json` is modified with correct exports for the new location.
 */
export function packageReadmeAndPackageJson() {
    return viteStaticCopy({
        targets: [
            { src: "README.md", dest: "" },
            {
                src: "package.json",
                dest: "",
                transform: (contents) => {
                    return packageJsonDist(contents);
                },
            },
        ],
    });
}
