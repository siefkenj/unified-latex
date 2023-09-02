# unified-latex Changelog

### v1.4.1
- Many more ligatures added to the HTML converter.
- Fixed issue [#40](https://github.com/siefkenj/unified-latex/issues/40) where the optional argument to `\\` was being parsed even if preceded by a space. (E.g., `\\[10pt]` and `\\ [10pt]`) were parsed the same. Not allowing the space should more closely match expected behavior.

### v1.4.0
- Better CJS support (now `unified` is compiled in rather than left as an external dependency. This is needed because `unified` is ESM-only).
- `minted` and `listings` environments now accept optional arguments and parse their contents verbatim. This makes them much more efficient.
### v1.3.0

-   Initial support for parsing and pretty-printing of tikz environments.
-   Added support for xparse `u`-type arguments.
-   Can now pass an `argumentParser` attribute for custom argument parsing (instead of relying on an xparse signature)
