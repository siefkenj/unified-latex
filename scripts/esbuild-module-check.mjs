import fs from "node:fs";

export const isCjsPackage = (dependency) => {
    const path = `../../node_modules/${dependency}/package.json`;
    if (fs.existsSync(path)) {
        const packageJson = JSON.parse(fs.readFileSync(path, "utf-8"));
        if (packageJson.type !== "module") {
            // We know that this package is a CommonJS package
            return true;
        }
        // If the package is `type === "module"`, it may still export CommonJS
        // via the `exports` field.
        if (packageJson.exports) {
            if (packageJson.exports["."]?.require) {
                return true;
            }
        }
    } else {console.log("could not resolve", dependency)}
    return false;
};
