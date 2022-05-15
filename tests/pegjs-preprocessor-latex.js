/* eslint-env node */

/*
 * This preprocessor allows .pegjs to be imported into Jest
 * tests.
 */

const peg = require("pegjs");

module.exports = {
    process: (src) => {
        const parser = peg.generate(src, {
            output: "source",
            format: "umd",
            allowedStartRules: ["document", "math"],
        });
        return { code: parser };
    },
};
