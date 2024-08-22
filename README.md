# unified-latex

Monorepo for `@unified-latex` packages. See the auto-generated [**Documentation**](https://siefkenj.github.io/unified-latex) for usage details.

These packages provide a JS/TypeScript interface for creating, manipulating, and printing LaTeX Abstract Syntax Trees (ASTs).

Most of the action lies in the

-   `packages/`
    directory, where you'll find plugins for [Unifiedjs](https://unifiedjs.com/) and standalone tools for parsing
    LaTeX to an Abstract Syntax Tree (AST). Though _parsing_ LaTeX isn't possible
    since it effectively has no grammar, _unified-latex_ makes some
    practical assumptions. It should work on your code, unless you do complicated things like redefine control sequences
    or embed complicated TeX-style macros.

## How it works

_unified-latex_ uses PEG.js to define a PEG grammar for LaTeX.
LaTeX source is first parsed with this grammar. Then it is post-processed
based on knowledge of special macros. (e.g., some macros are known to take
an argument, like `\mathbb`. Such arguments are not detected in the PEG
processing stage).

See the [`examples/`](https://github.com/siefkenj/unified-latex/tree/main/examples) folder for usage samples.

## Development

You should develop in each project's subfolder in the `packages/` directory.
These packages are set up as `npm` _workspaces_.

If you have `node.js` and `npm` installed, run

```sh
npm install
```

in **this \(the root\)** directory. Then — after doing a full build as explained below first! — you may build any particular package \(for example\)

```sh
cd packages/unified-latex
npm install
npm run build
```

### Building

`vite` is used to create bundled packages in the esm and commonjs formats. Builds are managed by `wireit` which can intelligently rebuild dependencies when they change. All compiled files are stored in the `dist/` directory of a workspace.

To build code for all workspaces, run

```sh
npm run build -ws
```

from the root directory.

If typescript complains about imports not existing in `rootDir`, it probably means that there is not a TypeScript _reference_ to that
particular workspace. (References are how typescript divides projects into different pieces so that it doesn't need to recompile every project).
Add the imported project to the `"references"` field of the `tsconfig.json`.

Note that all `tsconfig.json` files extend `tsconfig.build.json`, which has some special configuration options to forward imports of `@unified-latex/...`
directly to the correct folder during development.

### Testing

Tests in a specific workspace can be run via `npx vitest` in that workspace. These for the whole project can be run via `npm run test` in the
root directory.

Since built packages are expected to support both `esm` and `commonjs`, testing of the built packages occurs in `test/esm` and `test/cjs`. To run these tests, make sure you have built all packages **first**. Run the following:

```bash
npm run build
npm run test:packages-install
npm run test:packages-esm
npm run test:packages-cjs
```

The `test:packages-install` runs `npm pack` on each `dist/` directory and then copies the packaged files into the `test/dist` directory. Both `test/esm` and `test/cjs` install from these files (not the files hosted by `npm`).

### Readme Generation and Consistency

`README.md` files for all workspaces are generated automatically by running

```sh
npx vite-node scripts/build-docs.ts
```

`package.json` files can be checked for naming consistency by running

```sh
npx vite-node scripts/package-consistency.ts
```

### Publishing

Version management is done with `lerna`. Run

```sh
npx lerna version
```

to update the version of all packages. Run

```sh
npm run package
npm run publish
```

to publish all workspaces.

## Playground

You use the [Playground](https://siefkenj.github.io/latex-parser-playground) to view
how latex is parsed/pretty-printed. To run your own version, visit the [playground repository](https://github.com/siefkenj/latex-parser-playground),
and make a local clone. After running `npm install`, run `npm link` in your local `latex-parser` repository. Then, run `npm link latex-ast-parser`
in the local playground repository. This will mirror your development version of latex-parser in the playground.

## Related Projects

-   Some code was borrowed from Michael Brade's [`LaTeX.js`](https://github.com/michael-brade/LaTeX.js) project
-   [Prettier](https://prettier.io/) is a code-formatting library
-   [`tree-sitter-latex`](https://github.com/latex-lsp/tree-sitter-latex) a [`tree-sitter`](https://github.com/tree-sitter/tree-sitter) grammar for incremental parsing of LaTeX
-   [Texlab](https://github.com/latex-lsp/texlab) a Rust implementation of the Language Server Protocol for LaTeX
