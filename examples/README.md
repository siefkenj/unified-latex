# Examples

Here you can find annotated examples of how to use `unified-latex` to accomplish common tasks. The examples can be run
with `npx vite-node <example file>`.

-   `count-macros.ts` - goes through the basics of parsing source to a `unified-latex` AST and walking the tree to gather
    information about its contents.
-   `custom-macros.ts` - shows how to add your own macros to the parse process.
-   `ignore-defaults.ts` - shows how to parse a string without including any default packages (not even LaTeX2e standard ones).
-   `expanding-or-replacing-macros.ts` - shows how to expand or replace macros present in an AST.
-   `using-unified.ts` - shows how to use `unified` in combination with `unified-latex` to build a processing pipeline.
