//
// This grammar parses for tex ligatures like `` or --- or \:a.
//
{
    //
    // These are compatability functions used when running in the browser
    //
    // Check if the `options` object has the functions that we need.
    // If not, try to add them
    if (!options.isWhitespace) {
        try {
            Object.assign(options, {
                isMacro: (node) => node.type === "macro",
                isWhitespace: (node) => node.type === "whitespace",
                isRecognized: (nodes) => {
                    if (
                        nodes.length == 2 &&
                        nodes[0].content === "^" &&
                        nodes[1].content === "o"
                    ) {
                        return { type: "string", content: "ô" };
                    }

                    return null;
                },
                isSplitable: (node) =>
                    node.type === "string" && node.content.length > 1,
                split: (node) => [
                    { type: "string", content: node.content.charAt(0) },
                    { type: "string", content: node.content.slice(1) },
                ],
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = e:(triple_ligature / double_ligature / mono_ligature / .)+ {
            // We may have inserted nested arrays.
            // Flatten everything before we're done and remove any
            // resitual `null`s
            return [].concat(...e).filter((n) => !!n);
        }
    / EOL { return []; }

triple_ligature
    = toks:(. . .) & { return options.isRecognized(toks); } {
            return options.isRecognized(toks);
        }

double_ligature
    = double_macro_ligature
    / double_macro_ligature_extracted
    / double_char_ligature

// The char following the macro might be in a string combine with many other
// characters (e.g. ["\^", "ob"] rather than ["\^", "o"]). 
// In that case, we extract the first char from the string and see if
// it works. If so, we extract it from the string.
double_macro_ligature_extracted
    = tok1:macro
        whitespace*
        tok2:splitable
        & {
                const split = options.split(tok2);
                return options.isRecognized([tok1, split[0]]);
            } {
            const split = options.split(tok2);
            return [options.isRecognized([tok1, split[0]]), split[1]];
        }

double_macro_ligature
    = tok1:macro
        whitespace*
        tok2:.
        & { return options.isRecognized([tok1, tok2]); } {
            return options.isRecognized([tok1, tok2]);
        }

double_char_ligature
    = toks:(. .) & { return options.isRecognized(toks); } {
            return options.isRecognized(toks);
        }

mono_ligature
    = tok:. & { return options.isRecognized([tok]); } {
            return options.isRecognized([tok]);
        }

macro = tok:. & { return options.isMacro(tok); } { return tok; }

whitespace = tok:. & { return options.isWhitespace(tok); } { return tok; }

splitable = tok:. & { return options.isSplitable(tok); } { return tok; }

EOL = !.
