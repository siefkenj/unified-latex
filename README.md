# unified-latex
Monorepo for `@unified-latex` packages.

These packages provide a JS/TypeScript interface for creating, manipulating, and printing LaTeX Abstract Syntax Trees (ASTs).

Most of the action lies in the
  - `packages/`
directory, where you'll find plugins for [Unifiedjs](https://unifiedjs.com/) and standalone tools for parsing
LaTeX to an Abstract Syntax Tree (AST). Though *parsing* LaTeX isn't possible
since it effectively has no grammar, *unified-latex* makes some
practical assumptions. It should work on your code, unless you do complicated things like redefine control sequences
or embed complicated TeX-style macros.

## How it works

*unified-latex* uses PEG.js to define a PEG grammar for LaTeX.
LaTeX source is first parsed with this grammar. Then it is post-processed
based on knowledge of special macros. (e.g., some macros are known to take
an argument, like `\mathbb`. Such arguments are not detected in the PEG
processing stage).

## Development

You should develop in each project's subfolder in the `packages/` directory.
These packages are set up as `npm` _workspaces_.

If you have `node.js` and `npm` installed, run
```
npm install
```
in **this (the root)** directory. Then you may (for example)
```
cd packages/unified-latex
npm install
npm run build
```

### Building

Building is a two-stage process. `esbuild` is used to create bundled packages in the esm and commonjs formats. Secondly, the TypeScript
compiler is used to create the needed type information. All compiled files are stored in the `dist/` directory of a workspace.

To build code for all workspaces, run
```
npm run build -ws
```
from the root directory.

If typescript complains about imports not existing in `rootDir`, it probably means that there is not a TypeScript _reference_ to that
particular workspace. (References are how typescript divides projects into different pieces so that it doesn't need to recompile every project).
Add the imported project to the `"references"` field of the `tsconfig.json`.

Note that all `tsconfig.json` files extend `tsconfig.build.json`, which has some special configuration options to forward imports of `@unified-latex/...`
directly to the correct folder during development.

### Testing

Tests in a specific workspace can be run via `npx jest` in that workspace. These for the whole project can be run via `npm run tests` in the
root directory.

### Readme Generation and Consistency

`README.md` files for all workspaces are generated automatically by running

```
npx esr scripts/build-docs.ts
```

`package.json` files can be checked for naming consistency by running

```
npx esr scripts/package-consistency.ts
```

## Playground

You use the [Playground](https://siefkenj.github.io/latex-parser-playground) to view
how latex is parsed/pretty-printed. To run your own version, visit the [playground repository](https://github.com/siefkenj/latex-parser-playground),
and make a local clone. After running `npm install`, run `npm link` in your local `latex-parser` repository. Then, run `npm link latex-ast-parser`
in the local playground repository. This will mirror your development version of latex-parser in the playground.

## Related Projects

  * Some code was borrowed from Michael Brade's `LaTeX.js` project https://github.com/michael-brade/LaTeX.js
  * Prettier is a code-formatting library https://prettier.io/
