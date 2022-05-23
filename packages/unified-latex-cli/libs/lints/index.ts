import { lints } from "@unified-latex/unified-latex-lint/dist";

export const availableLints = Object.fromEntries(
    Object.values(lints).map((lint) => [
        lint.name.replace(/^unified-latex-lint:/, ""),
        lint,
    ])
);
