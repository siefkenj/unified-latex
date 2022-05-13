//
// A PEG grammar for processing the contents of the \systeme{...} commands
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
                isSep: (node) => node.type === "string" && node.content === ",",
                isVar: (node) =>
                    node.type === "string" && node.content.match(/[a-zA-Z]/),
                isOperation: (node) =>
                    node.type === "string" && node.content.match(/[+-]/),
                isEquals: (node) =>
                    node.type === "string" && node.content === "=",
                isAt: (node) => node.type === "string" && node.content === "@",
                isSubscript: (node) => node.content === "_",
                isWhitespace: (node) => node.type === "whitespace",
                isSameLineComment: (node) =>
                    node.type === "comment" && node.sameline,
                isOwnLineComment: (node) =>
                    node.type === "comment" && !node.sameline,
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = a:(comment_only_line / line_with_sep / partial_line_with_comment)*
        b:(line_without_sep / EOL) { return a.concat(b ? b : []); }
    / EOL { return []; }

partial_item "partial item"
    = _* a:non_var_token* _* b:var _* c:token* _* { return a.concat(b, c); }

item "item"
    = op:operation? _* a:non_var_token* _* b:var _* c:token* _* {
            return { type: "item", op, variable: b, content: a.concat(b, c) };
        }
    / op:operation? _* a:non_var_token+ _* {
            return { type: "item", op, variable: null, content: a };
        }

line_with_sep
    = line:line_without_sep sep:sep comment:trailing_comment? {
            return { ...line, sep: [].concat(sep), trailingComment: comment };
        }

partial_line_with_comment
    = line:line_without_sep comment:trailing_comment {
            return { ...line, trailingComment: comment };
        }

line_without_sep
    = &. eq:equation ann:annotation? {
            return {
                type: "line",
                equation: eq,
                annotation: ann,
                sep: null,
            };
        }

annotation
    = at:at ann:non_sep_token* {
            return at ? { type: "annotation", marker: at, content: ann } : null;
        }

equation "equation"
    = left:item* eq:equals? right:(token / operation)* {
            return { type: "equation", left, right, equals: eq };
        }

trailing_comment "trailing comment" = _* x:same_line_comment { return x; }

comment_only_line "comment only line"
    = _* x:own_line_comment {
            return {
                type: "line",
                trailingComment: x,
            };
        }

var = v:var_token _* s:subscript? { return [v].concat(s ? s : []); }

non_var_token "non-var token" = !var t:token { return t; }

non_sep_token = !(sep / trailing_comment / own_line_comment) x:. { return x; }

token "token"
    = !(sep / at / operation / equals / trailing_comment / own_line_comment)
        x:. { return x; }

// These rules use Javascript to do their matching
// so that they can work on AST nodes instead of strings
same_line_comment "same line comment"
    = tok:. & { return options.isSameLineComment(tok); } { return tok; }

own_line_comment "own line comment"
    = tok:. & { return options.isOwnLineComment(tok); } { return tok; }

_ = tok:. & { return options.isWhitespace(tok); } { return tok; }

sep "," = tok:. & { return options.isSep(tok); } { return tok; }

at "@" = tok:. & { return options.isAt(tok); } { return tok; }

var_token "variable token"
    = tok:. & { return options.isVar(tok); } { return tok; }

operation "+/-"
    = _* tok:. _* & { return options.isOperation(tok); } { return tok; }

equals "=" = tok:. & { return options.isEquals(tok); } { return tok; }

subscript = tok:. & { return options.isSubscript(tok); } { return tok; }

EOL = !.
