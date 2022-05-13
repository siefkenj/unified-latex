//
// This grammar parses a macro substitution context (for example, as defined
// by `\newcommand{\foo}[1]{the macro substitution context #1}`)
//
{
    //
    // These are compatability functions used when running in the browser
    //
    // Check if the `options` object has the functions that we need.
    // If not, try to add them
    if (!options.isHash) {
        try {
            Object.assign(options, {
                isHash: (node) =>
                    node.type === "string" && node.content === "#",
                isNumber: (node) =>
                    node.type === "string" && 0 < +node.content.charAt(0),
                splitNumber: (node) => {
                    const number = +node.content.charAt(0);
                    if (node.content.length > 1) {
                        return {
                            number,
                            rest: {
                                type: "string",
                                content: node.content.slice(1),
                            },
                        };
                    }
                    return { number };
                },
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = e:(double_hash / hash_number / .)+ {
            // We may have inserted nested arrays.
            // Flatten everything before we're done and remove any
            // resitual `null`s
            return [].concat(...e).filter((n) => !!n);
        }
    / EOL { return []; }

hash = tok:. & { return options.isHash(tok); } { return tok; }

number = tok:. & { return options.isNumber(tok); } { return tok; }

double_hash = hash hash { return { type: "string", content: "#" }; }

hash_number
    = hash num:number {
            const split = options.splitNumber(num);
            return [{ type: "hash_number", number: split.number }, split.rest];
        }

EOL = !.
