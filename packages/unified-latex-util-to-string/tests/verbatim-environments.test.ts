import { parse, parseMinimal } from "@unified-latex/unified-latex-util-parse";
import { toString } from "../libs/to-string";

describe("unified-latex-util-to-string", () => {
    const STRINGS = [
        "\\begin{lstlisting}\nint x;\n\\end{lstlisting}",
        "\\begin{lstlisting}[caption=Test]\nint x;\n\\end{lstlisting}",
        "\\begin{minted}{python}\nx = 1\n\\end{minted}",
        "\\begin{minted}[linenos]{python}\nx = 1\n\\end{minted}",
    ];

    it("preserves lstlisting and minted bodies", () => {
        for (const str of STRINGS) {
            const once = toString(parse(str));
            expect(once).toEqual(str);
            expect(toString(parse(once))).toEqual(str);
        }
    });

    it("preserves lstlisting and minted bodies parsed minimally", () => {
        for (const str of STRINGS) {
            const once = toString(parseMinimal(str));
            expect(once).toEqual(str);
            expect(toString(parseMinimal(once))).toEqual(str);
        }
    });
});
