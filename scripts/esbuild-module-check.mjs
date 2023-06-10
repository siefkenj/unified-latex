import fs from "node:fs";

export const isCjsPackage = (dependency) => {
    const path = `../../node_modules/${dependency}/package.json`;
    if (fs.existsSync(path)) {
        return JSON.parse(fs.readFileSync(path)).type !== "module";
    }
    return true;
};
