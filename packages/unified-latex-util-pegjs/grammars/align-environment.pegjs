//
// A PEG grammar for processing the contents of an align environment.
// This grammar takes special care to allow for comments and the end of
// a row. Code to identify AST nodes must be passed into the `options` object,
// and arrays must be decorated with `.charAt`, `.charCodeAt`, and `.substring`
// methods.
//
{
    function processRow(leadCell, otherCells) {
        const cells = [leadCell || []];
        const seps = [];
        for (const x of otherCells) {
            cells.push(x.cell || []);
            seps.push(x.colSep);
        }
        return { cells, colSeps: seps };
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
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = (comment_only_line / row_with_end / row_without_end)+
    / EOL { return []; }

row_with_end
    // If there is a row ending we can have zero items
    = rowItems:(x:row_items? { return { cells: [], colSeps: [], ...x }; })
        rowSep:row_sep
        trailingComment:trailing_comment? {
            return { ...rowItems, rowSep, trailingComment };
        }

row_without_end
    // If there is no row ending, we must have a row item
    = rowItems:row_items trailingComment:trailing_comment? {
            return { ...rowItems, rowSep: null, trailingComment };
        }

trailing_comment = whitespace* x:same_line_comment { return x; }

comment_only_line
    = whitespace* x:own_line_comment {
            return {
                cells: [],
                colSeps: [],
                rowSep: null,
                trailingComment: x,
            };
        }

token
    = !(row_sep / col_sep / trailing_comment / own_line_comment) x:. {
            return x;
        }

cell = $token+

separated_cell
    = colSep:col_sep cell:cell { return { colSep, cell }; }
    / colSep:col_sep { return { colSep }; }

row_items
    = a:cell b:separated_cell* { return processRow(a, b); }
    / b:separated_cell+ { return processRow(null, b); }

// These rules use Javascript to do their matching
// so that they can work on AST nodes instead of strings
same_line_comment
    = tok:. & { return options.isSameLineComment(tok); } { return tok; }

own_line_comment
    = tok:. & { return options.isOwnLineComment(tok); } { return tok; }

whitespace = tok:. & { return options.isWhitespace(tok); } { return tok; }

row_sep = tok:. & { return options.isRowSep(tok); } { return tok; }

col_sep = tok:. & { return options.isColSep(tok); } { return tok; }

EOL = !.

/*
// Sample code that "tricks" pegjs into parsing an array

code=String.raw`term = 
    (integer / whitespace / nl )*

integer = 
	&(a:. &{
	console.log("matching", a, options);
	return a === "123" ;
	}) x:. {return "SPECIAL 123"}
	/ x:[0-9]+ {return {x}}
 
whitespace = 
    [ \t\s]+ {return "."}
    
nl = "\n" {return "newline"}`

p = PEG.generate(code);

w = ["123", "345", "   ", "435"]
w.charAt = function(i) {
    //console.log("charAt", i)
    return this[i]
}
w.charCodeAt = function(i) {
    //console.log("charCodeAt", i)
    return 0
}
w.substring = function(a,b) {
    console.log("substring called", a, b)
    return this.slice(a,b)
}

p.parse(w, {x:true})



*/
