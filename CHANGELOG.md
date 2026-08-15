# unified-latex Changelog

### Unreleased

- PreTeXt conversion improvements:
    - Support the `exam` document class (questions, parts, choices, solutions, etc.).
    - Support top-level `divisions` (`article`/`book`/`slideshow`) and better handling of specialized divisions.
    - Support `plus`-prefixed inclusion macros.
    - Support Beamer and `tikzpicture` conversion.
    - Support math environments (`align`, `equation`, `gather`, `multline`, `alignat`, etc.).
    - Basic bibliography support (`thebibliography`/`\bibitem`), with better BibTeX/CSL-based formatting.
    - Add `<bibinfo>` support and improve detection of macros/environments that don't apply to PreTeXt.
    - Handle comments and unknown tags instead of erroring.
    - Handle vertical space (`\vspace`, `\bigskip`, etc.) and starred environments.
    - Add capitalization variants for some macros.
    - Escape slashes when generating `xml:id`s.
- Fix TypeScript build configuration issues.
- Add many additional tests for PreTeXt conversion.

### v1.8.4

- PreTeXt conversion improvements:
    - Support most environments and macros for PreTeXt conversion.
    - Labels handled correctly in PreTeXt conversion.
    - LaTeX quotes converted to `<q>` in PreTeXt conversion.
- Fix issue where `\begin{lstlisting}` environment could not take optional arguments.

### v1.8.3

- Support `\ref` in PreTeXt conversion
- Better use of UnifiedJS to parse but not print LaTeX
- Support for `\verb`, `\textsuperscript`, `\textsubscript`, `\sout`, and `\" i` in HTML conversion

### v1.8.2

- Upgraded dependencies

### v1.8.1

- Changed Peggy to implement a caching parser to prevent large slowdown on some files.

### v1.8.0

- Added initial PreTeXt conversion support
- Upgraded deps
- Added `amsart` macros
- Consume the whitespace after special character macros when expanding ligatures. For example `\o y` produces `øy` instead of `ø y`
- Fix signatures of `\hyphenation`

### v1.7.1

- Types fix for `@unified-latex/unified-latex-types`
- Fixed AST when expanding `\sysdelim` macros for rendering `\systeme{}` macros with KaTeX

### v1.7.0

- Switch build system to `vite`. Should result in smaller bundles.
- Save default arguments when parsing if the macro signature specifies them e.g. `{signature: "O{foo}"}`. The defaults are substituted in when expanding the macros with the optional arguments omitted.
- Preserve position information when comments are modified. (Sometimes, during a `parse`, but never during a `parseMinimal`, comments are modified to remove leading whitespace. Previously, modified comments would have their position information deleted. Position information is now preserved.)

### v1.6.1

- Pass `VisitInfo` as an additional argument ot `macroReplacers` and `environmentReplacers` in `unifiedLatexToHast`.
- Allow skipping of HTML validation in `unifiedLatexToHast`.
- The `minted` environment parses its contents as a verbatim.

### v1.6.0

- Embellishment tokens are now supported in macro `signature`s. E.g., a `xxx: {signature: "e{^_}"}` will allow `\xxx_{foo}^{bar}` and `\xxx^{foo}_{bar}` to parse correctly.
- Stop tokens can now be regular string characters. For example `xxx: {signature: "ua"}` will allow `\xxx YYYaBBB` to consume `YYY` leaving `BBB` unconsumed.
- Break after `\\` macro when pretty printing (Issue #59)
- [DEVELOPMENT] Added `tsconfig.json` files to each `test/` folder for more granular control of the typescript settings.

### v1.5.0

- HTML conversion: `vspace` and `hspace` now give the amount in a `data-amount` attribute.
- HTML conversion: unknown macros now have their arguments wrapped in spans instead of appearing as formatted LaTeX code.
- Add basic Markdown conversion support.

### v1.4.2

- Avoid slowdown when paring incomplete environments (e.g. `\newcommand{\x}{\begin{x}}`). This is accomplished by enabling caching in PEGjs.
- Added `"` ligature and `\paragraph` and `\subparagraph` to HTML conversion.

### v1.4.1

- Many more ligatures added to the HTML converter.
- Fixed issue [#40](https://github.com/siefkenj/unified-latex/issues/40) where the optional argument to `\\` was being parsed even if preceded by a space. (E.g., `\\[10pt]` and `\\ [10pt]`) were parsed the same. Not allowing the space should more closely match expected behavior.
- Bump Prettier to v2.8.8

### v1.4.0

- Better CJS support (now `unified` is compiled in rather than left as an external dependency. This is needed because `unified` is ESM-only).
- `minted` and `listings` environments now accept optional arguments and parse their contents verbatim. This makes them much more efficient.

### v1.3.0

- Initial support for parsing and pretty-printing of tikz environments.
- Added support for xparse `u`-type arguments.
- Can now pass an `argumentParser` attribute for custom argument parsing (instead of relying on an xparse signature)
