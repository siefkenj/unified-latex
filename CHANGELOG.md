# unified-latex Changelog

### v1.7.0
- Switch build system to `vite`. Should result in smaller bundles.
- Save default arguments when parsing if the macro signature specifies them e.g. `{signature: "O{foo}"}`. The defaults are substituted in when expanding the macros with the optional arguments omitted.

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

-   Initial support for parsing and pretty-printing of tikz environments.
-   Added support for xparse `u`-type arguments.
-   Can now pass an `argumentParser` attribute for custom argument parsing (instead of relying on an xparse signature)
