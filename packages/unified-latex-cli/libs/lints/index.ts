import { lints } from "@unified-latex/unified-latex-lint";

export const availableLints: Record<
    string,
    (typeof lints)[keyof typeof lints]
> = Object.fromEntries(
    Object.values(lints).map((lint) => [
        lint.name.replace(/^unified-latex-lint:/, ""),
        lint,
    ])
);
