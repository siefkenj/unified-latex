#!/usr/bin/env bash

set -eu

# Use VIM as the command line git editor. Not everyone's preference, but oh well...
git config core.editor vim

npm ci

# Mirrors the "Build" step in .github/workflows/on-pull-request.yml. The build is
# needed before testing, not just before publishing: the CLI tests run
# `packages/unified-latex-cli/dist/unified-latex-cli.mjs`, and the package tests
# pack each `packages/*/dist`. `unified-latex-cli` depends on almost every other
# package, so building it first surfaces errors early.
npm run build -w packages/unified-latex-cli
npm run build -ws --if-present

echo
echo "Toolchain:"
echo "  node $(node --version)"
echo "  npm $(npm --version)"
echo
echo "Run the tests with:            npm test             (watch mode; npm run test:ci for a single run)"
echo "Test the packed packages with: npm run test:packages-install && npm run test:packages-esm && npm run test:packages-cjs"
echo "Rebuild after changes with:    npm run build -ws --if-present"
