//
// A PEG grammar for processing the contents of a tikz environment
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
                isChar: (node, char) =>
                    node.type === "string" && node.content === char,
                isOperation: (node) =>
                    node.type === "string" && node.content.match(/[a-zA-Z]/),
                isWhitespace: (node) =>
                    node.type === "whitespace" || node.type === "parbreak",
                isSameLineComment: (node) =>
                    node.type === "comment" && node.sameline,
                isOwnLineComment: (node) =>
                    node.type === "comment" && !node.sameline,
                isComment: (node) => node.type === "comment",
                isGroup: (node) => node.type === "group",
                isMacro: (node, name) =>
                    node.type === "macro" && node.content === name,
                isAnyMacro: (node) => node.type === "macro",
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

path_spec
    = ops:(
        v:(
                square_brace_group
                / coordinate
                / curve_to
                / line_to
                / svg
                / foreach
                / operation
                / comment
                / animation
                / unknown
            )
            _* { return v; }
    )+ { return { type: "path_spec", content: ops }; }

animation
    = colon
        c1:_comment_
        ops:(op:operation comment:_comment_ { return { op, comment }; })+
        equals
        c2:_comment_
        body:group {
            const comments = [c1, ...ops.map((x) => x.comment), c2].filter(
                (x) => x
            );
            const attribute = ops.map((x) => x.op.content.content).join(" ");
            return {
                type: "animation",
                comments,
                attribute,
                content: body.content,
            };
        }

foreach
    = start:(foreach_keyword / foreach_macro) b:foreach_body {
            return { ...b, start, type: "foreach" };
        }

foreach_body
    = c1:_comment_
        variables:$(!(in_keyword / square_brace_group) .)*
        options:square_brace_group?
        c2:_comment_
        in_keyword
        c3:_comment_
        list:(group / macro)
        c4:_comment_
        command:(foreach / group / macro) {
            const comments = [c1, c2, c3, c4].filter((x) => x);
            return {
                type: "foreach_body",
                variables,
                options: options && options.content,
                list,
                command,
                comments,
            };
        }

svg
    = svg_keyword
        c1:_comment_
        options:square_brace_group?
        c2:_comment_
        body:group {
            const comments = [c1, c2].filter((x) => x);
            return {
                type: "svg_operation",
                options: options && options.content,
                content: body,
                comments,
            };
        }

curve_to
    = dotdot
        c1:_comment_
        controls_keyword
        c2:_comment_
        coord:coordinate
        c3:_comment_
        a:(
            and_keyword c4:_comment_ x:coordinate {
                    return { coord: x, comment: c4 };
                }
        )?
        c5:_comment_
        dotdot {
            const comments = [c1, c2, c3, a && a.comment, c5].filter((x) => x);
            return {
                type: "curve_to",
                controls: a ? [coord, a.coord] : [coord],
                comments,
            };
        }

line_to
    = pipe minus { return { type: "line_to", command: "|-" }; }
    / minus pipe { return { type: "line_to", command: "-|" }; }
    / minus minus { return { type: "line_to", command: "--" }; }

coordinate
    = prefix:$(plus plus?)? open_paren content:$(!close_paren .)* close_paren {
            return { type: "coordinate", content, prefix };
        }

square_brace_group
    = open_square_brace content:$(!close_square_brace .)* close_square_brace {
            return { type: "square_brace_group", content };
        }

dotdot = dot dot

unknown = v:. { return { type: "unknown", content: v }; }

// These rules use Javascript to do their matching
// so that they can work on AST nodes instead of strings
same_line_comment "same line comment"
    = tok:. & { return options.isSameLineComment(tok); } { return tok; }

own_line_comment "own line comment"
    = tok:. & { return options.isOwnLineComment(tok); } { return tok; }

comment "comment" = tok:. & { return options.isComment(tok); } { return tok; }

_ = tok:. & { return options.isWhitespace(tok); } { return tok; }

// Whitespace that may also include comments
_comment_ "floating comment" = _* c:comment? _* { return c; }

operation "operation"
    = tok:. & { return options.isOperation(tok); } {
            return { type: "operation", content: tok };
        }

equals "=" = tok:. & { return options.isChar(tok, "="); } { return tok; }

open_square_brace = tok:. & { return options.isChar(tok, "["); } { return tok; }

close_square_brace
    = tok:. & { return options.isChar(tok, "]"); } { return tok; }

open_paren = tok:. & { return options.isChar(tok, "("); } { return tok; }

close_paren = tok:. & { return options.isChar(tok, ")"); } { return tok; }

plus = tok:. & { return options.isChar(tok, "+"); } { return tok; }

minus = tok:. & { return options.isChar(tok, "-"); } { return tok; }

pipe = tok:. & { return options.isChar(tok, "|"); } { return tok; }

dot = tok:. & { return options.isChar(tok, "."); } { return tok; }

controls_keyword
    = tok:. & { return options.isChar(tok, "controls"); } { return tok; }

and_keyword = tok:. & { return options.isChar(tok, "and"); } { return tok; }

svg_keyword = tok:. & { return options.isChar(tok, "svg"); } { return tok; }

group = tok:. & { return options.isGroup(tok); } { return tok; }

macro = tok:. & { return options.isAnyMacro(tok); } { return tok; }

foreach_keyword
    = tok:. & { return options.isChar(tok, "foreach"); } { return tok; }

foreach_macro
    = tok:. & { return options.isMacro(tok, "foreach"); } { return tok; }

in_keyword = tok:. & { return options.isChar(tok, "in"); } { return tok; }

colon = tok:. & { return options.isChar(tok, ":"); } { return tok; }

EOL = !.
