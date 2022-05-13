//
// This grammar parses the argument specification of the tabular/array environment
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
                matchChar: (node, char) =>
                    node.type === "string" && node.content === char,
                isGroup: (node) => node.type === "group",
                isWhitespace: (node) => node.type === "whitespace",
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = cols:(c:column _* { return c; })+ { return cols; }
    / EOL { return []; }

column
    = divs1:column_divider*
        start:decl_start?
        a:alignment
        end:decl_end?
        divs2:column_divider* {
            return {
                type: "column",
                pre_dividers: divs1,
                post_dividers: divs2,
                before_start_code: start,
                before_end_code: end,
                alignment: a,
            };
        }

column_divider
    = _*
        div:(
            vert {
                    return {
                        type: "vert_divider",
                    };
                }
            / b:bang g:group {
                    return {
                        type: "bang_divider",
                        content: g[0].content,
                    };
                }
            / at g:group {
                    return {
                        type: "at_divider",
                        content: g[0].content,
                    };
                }
        )
        _* { return div; }

decl_start "decl_start"
    = greater g:group { return { type: "decl_code", code: g[0].content }; }

decl_end "decl_end"
    = less g:group { return { type: "decl_code", code: g[0].content }; }

alignment
    = l { return { type: "alignment", alignment: "left" }; }
    / c { return { type: "alignment", alignment: "center" }; }
    / r { return { type: "alignment", alignment: "right" }; }
    / X { return { type: "alignment", alignment: "X" }; }
    / a:(p { return "top"; } / m { return "default"; } / b { return "bottom"; })
        _*
        g:group {
            return {
                type: "alignment",
                alignment: "parbox",
                baseline: a,
                size: g[0].content,
            };
        }
    / (w / W) _* g1:group _* g2:group {
            return {
                type: "alignment",
                alignment: "parbox",
                baseline: g1[0].content,
                size: g2[0].content,
            };
        }

vert "vert" = tok:. & { return options.matchChar(tok, "|"); }

l "l" = tok:. & { return options.matchChar(tok, "l"); }

r "r" = tok:. & { return options.matchChar(tok, "r"); }

c "c" = tok:. & { return options.matchChar(tok, "c"); }

p "p" = tok:. & { return options.matchChar(tok, "p"); }

m "m" = tok:. & { return options.matchChar(tok, "m"); }

b "b" = tok:. & { return options.matchChar(tok, "b"); }

w "w" = tok:. & { return options.matchChar(tok, "w"); }

W "W" = tok:. & { return options.matchChar(tok, "W"); }

// Spec from the tabularx package
X "X" = tok:. & { return options.matchChar(tok, "X"); }

bang "!" = tok:. & { return options.matchChar(tok, "!"); }

at "@" = tok:. & { return options.matchChar(tok, "@"); }

less "<" = tok:. & { return options.matchChar(tok, "<"); }

greater ">" = tok:. & { return options.matchChar(tok, ">"); }

group "group" = tok:. & { return options.isGroup(tok); }

_ "whitespace" = tok:. & { return options.isWhitespace(tok); }

EOL = !.
