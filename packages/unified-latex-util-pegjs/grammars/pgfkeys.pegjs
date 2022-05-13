//
// A PEG grammar for processing the contents of a pgfkeys environment.
// This grammar takes special care to allow for comments and the end of
// a row. Code to identify AST nodes must be passed into the `options` object,
// and arrays must be decorated with `.charAt`, `.charCodeAt`, and `.substring`
// methods.
//
{
    function processItem(leadCell, otherCells) {
        const cells = [leadCell || []];
        for (const x of otherCells) {
            cells.push(x.cell || []);
        }
        return { itemParts: cells };
    }

    //
    // These are compatability functions used when running in the browser
    //
    // Check if the `options` object has the functions that we need.
    // If not, try to add them
    if (!options.isWhitespace) {
        try {
            Object.assign(
                options,
                createMatchers(["\\", "hline", "cr"], ["&"])
            );
            Object.assign(options, {
                isComma(node) {
                    return node.type === "string" && node.content === ",";
                },
                isEquals(node) {
                    return node.type === "string" && node.content === "=";
                },
                isParbreak(node) {
                    return node.type === "parbreak";
                },
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = (comment_only_line / item_with_end / item_without_end)+
    / whitespace* EOL { return []; }

item = x:token+ item_sep? { return x; }

item_with_end
    // If there is a row ending we can have zero items
    = whitespace_or_parbreaks
        rowItems:row_items?
        whitespace_or_parbreaks
        item_sep
        whitespace*
        trailingComment:trailing_comment?
        whitespace* {
            return {
                itemParts: [],
                ...rowItems,
                trailingComment,
                trailingComma: true,
            };
        }

item_without_end
    // If there is no row ending, we must have a row item
    = whitespace_or_parbreaks
        rowItems:row_items
        trailingComment:trailing_comment? {
            return { ...rowItems, trailingComment };
        }

row_items
    = a:item_part b:separated_part* { return processItem(a, b); }
    / b:separated_part+ { return processItem(null, b); }

separated_part
    = parbreak* equals parbreak* cell:item_part { return { cell }; }
    / parbreak* equals { return {}; }

// the whitespace before and after an item part is trimmed
item_part
    = whitespace*
        part:$(
            non_whitespace_non_parbreak_token
            / (whitespace / parbreak)
                &((whitespace / parbreak)* non_whitespace_non_parbreak_token)
        )+
        whitespace* { return part; }

trailing_comment = whitespace* x:same_line_comment { return x; }

comment_only_line
    = space:whitespace_or_parbreaks x:own_line_comment {
            return {
                trailingComment: x,
                leadingParbreak: space.parbreak > 0,
            };
        }

token = $(!non_token .)

non_whitespace_non_parbreak_token = $(!(whitespace / parbreak) token)

non_token
    = item_sep
    / equals
    / trailing_comment
    / own_line_comment

whitespace_or_parbreaks
    = list:(whitespace / parbreak)* {
            return {
                whitespace: list.filter((x) => options.isWhitespace(x)).length,
                parbreak: list.filter((x) => options.isParbreak(x)).length,
            };
        }

// These rules use Javascript to do their matching
// so that they can work on AST nodes instead of strings
same_line_comment
    = tok:. & { return options.isSameLineComment(tok); } { return tok; }

own_line_comment
    = tok:. & { return options.isOwnLineComment(tok); } { return tok; }

whitespace = tok:. & { return options.isWhitespace(tok); } { return tok; }

parbreak = tok:. & { return options.isParbreak(tok); } { return tok; }

item_sep = tok:. & { return options.isComma(tok); } { return tok; }

equals = tok:. & { return options.isEquals(tok); } { return tok; }

EOL = !.
