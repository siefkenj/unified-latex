# unified-latex Changelog

### Unreleased

- Math parsing (fixes #53, #114, #132, #133):
    - Groups and environment bodies inside math are parsed in math mode, so, e.g., `$\frac{\frac12}{a}$` is no longer
      formatted as `$\frac{\frac{12}}{a}$` and `_` in `${a_b}$` is a subscript.
    - Macro arguments and environment bodies whose mode differs from their surroundings (e.g. `\text{...}` in math or
      `\ensuremath{...}` in text) are reparsed in the right mode, with positions that point into the original source.
      This replaces the previous heuristic.
    - **Possibly breaking:** in math, the contents of groups and macro arguments are split into single-character strings
      (e.g. `$\foo{ab}$` has the strings `a` and `b` instead of `ab`), like the rest of math content.
    - **Breaking:** `parseMinimal`, `parseMathMinimal` and `unifiedLatexFromStringMinimal` keep all whitespace in math,
      marking what would be removed with `_renderInfo.droppableInMath`. Use `processMacrosAndEnvironments` (or
      `unifiedLatexFromString`) to remove it.
    - New `processMacrosAndEnvironments` function, which attaches arguments and reparses content in the right mode in
      any part of a tree.
- `unifiedLatexReparseMath`:
    - Reparses the given math macros/environments whenever they were parsed in text mode, from the original source when
      available (use `processSync(str)` rather than `runSync(tree)`). Macro arguments in the reparsed content are
      attached, and the reparsed content is marked `inMathMode: true`.
    - New `macros` and `environments` options.
    - **Breaking:** `unifiedLatexReparseMathConstructPlugin` has been removed. Use `unifiedLatexReparseMath` instead.
- Macro and environment info:
    - Macros whose arguments are text are marked `inMathMode: false` (e.g. the `\text...` font macros, boxes,
      references, citations, `\label`, `\hspace`, `\color`, `\url`, `\includegraphics`, `\index` and `\tikz`), as are
      the tikz environments.
    - New `renderInfo.argumentsInMathMode` sets the mode of individual arguments (e.g. the color of `\textcolor` is
      text, while its body is in the mode of its surroundings).
    - Add the `natbib` and `biblatex` packages, and `\boxed`, `\tag`, `\intertext`, `\shortintertext`, `\mathop`,
      `\nameref`, `\textsuperscript`, `\textsubscript`, `\hbox`, `\vbox` and `\vtop`.
    - `alignat` and `eqnarray` (and their starred forms) are parsed as math environments. The column count of
      `alignat` is attached as an argument.
- Arguments written with braces or brackets have a `position` that includes them.
- `visit` reports the mode of each argument in `info.context.inMathMode`, reports the body of any `mathenv` as math, and
  reports the arguments of environments (e.g. the column specification of `array`) as text.
- HTML conversion: `eqnarray` is converted to a KaTeX `darray`, and `\hbox`, `\vbox` and `\vtop` to `<span>`s.
- PreTeXt conversion: `natbib` and `biblatex` citations are converted to `<xref>`s, `\nameref` to
  `<xref text="title">`, and the content of `\textsuperscript`, `\textsubscript`, `\hbox`, `\vbox`, `\vtop` and
  `\citetext` is kept.
- The `no-plaintext-operators` lint rule detects operators in groups in math (e.g. `${sin x}$` or `$x^{sin y}$`), in
  `\mathnormal{...}`, and in font macros and switches whose content isn't a single word (e.g. `\mathrm{a + sin b}`).

### v1.8.5

- PreTeXt conversion improvements:
    - Support the `exam` document class (questions, parts, choices, solutions, etc.).
    - Support top-level `divisions` (`article`/`book`/`slideshow`) and better handling of specialized divisions.
    - Support `plus`-prefixed inclusion macros.
    - Support Beamer and `tikzpicture` conversion.
    - Support `slide` and `frame` environments as synonyms.
    - Support math environments (`align`, `equation`, `gather`, `multline`, `alignat`, etc.).
    - Basic bibliography support (`thebibliography`/`\bibitem`), with better BibTeX/CSL-based formatting.
    - Add `<bibinfo>` support and improve detection of macros/environments that don't apply to PreTeXt.
    - Handle comments and unknown tags instead of erroring.
    - Handle vertical space (`\vspace`, `\bigskip`, etc.) and starred environments.
    - Add capitalization variants for some macros.
    - Escape slashes when generating `xml:id`s.
    - Fix issue with synonyms of environments not getting titles.
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
