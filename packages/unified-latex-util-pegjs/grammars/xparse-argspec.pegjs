//
// This grammar parses the arg specification according to `xparse`.
// See the full specification here: https://ctan.org/pkg/xparse?lang=en
//
{
    const DEFAULT_OPTIONS = {
        optional: { openBrace: "[", closeBrace: "]" },
        mandatory: { openBrace: "{", closeBrace: "}" },
    };
    function createNode(type, options) {
        const computedOptions = DEFAULT_OPTIONS[type] || {};
        return { type, ...computedOptions, ...options };
    }
    /**
     * Recursively return the content of an array until there are no more arrays
     */
    function arrayContent(node) {
        if (typeof node === 'string') { return node; }
        return '{' + node.map(arrayContent).join('') + '}'
    }
}

args_spec_list
    = spec:(whitespace x:arg_spec { return x; })* whitespace? { return spec; }

arg_spec
    // Arguments can be preceeded by a `+` to indicated that they are allowed to take
    // multiple paragraphs. We don't use this information, but we allow it in the args string
    = "+"? spec:(optional / mandatory / verbatim / required / body / until) {
            return spec;
        }

verbatim
    // verbatim arguments use the same symbol to start and stop the sequence
    = "v" openBrace:. {
            return createNode("verbatim", { openBrace, closeBrace: openBrace });
        }

body = "b" { return createNode("body"); }

// Optional arguments
optional
    // If optional arguments have a ! in front, then leading whitespace is not allowed before absorbing
    // the optional argument
    = leading_bang:"!"?
        spec:(
            optional_star
            / optional_standard
            / optional_delimited
            / optional_embellishment
            / optional_token
        ) {
            return leading_bang ? { ...spec, noLeadingWhitespace: true } : spec;
        }

optional_delimited
    = "D" braceSpec:brace_spec defaultArg:token_or_group {
            return createNode("optional", { ...braceSpec, defaultArg });
        }
    / "d" braceSpec:brace_spec { return createNode("optional", braceSpec); }

optional_star = "s" { return createNode("optionalStar"); }

optional_standard
    = "O" g:token_or_group { return createNode("optional", { defaultArg: g }); }
    / "o" { return createNode("optional"); }

optional_embellishment
    = "e" args:token_or_collection {
            return createNode("embellishment", {
                tokens:args
            });
        }
    / "E" args:token_or_collection g:token_or_collection {
            return createNode("embellishment", {
                tokens: args,
                defaultArgs: g
            });
        }

optional_token
    = "t" tok:. { return createNode("optionalToken", { token: tok }); }

// Required arguments
required
    = "R" braceSpec:brace_spec defaultArg:token_or_group {
            return createNode("mandatory", { ...braceSpec, defaultArg });
        }
    / "r" braceSpec:brace_spec { return createNode("mandatory", braceSpec); }

// An "until" argument gobbles tokens until the specified stop token(s). Until token allows whitespace.
until
    = "u" stopTokens:(x:token { return [x] } / '{' @(token_or_whitespace+) '}') {
            return createNode("until", { stopTokens });
        }

// A mandatory argument is a required argument with the default braces {...}
mandatory = "m" { return createNode("mandatory"); }

// Used to specify a pair of opening and closing braces
// Normally "d{}" doesn't work in plain LaTeX, but a lot of strange commands
// in beamer are modeled by d{}, so we provide a special casing here.
brace_spec
    = openBrace:token_or_group closeBrace:token_or_group {
            return { openBrace, closeBrace };
        }
    / "{}" { return { openBrace: "{", closeBrace: "}"}}

braced_group
    = "{" content:( token_or_whitespace / braced_group)* "}" {
            return content;
        }

non_brace
    = ![{} ] @.

// https://tex.stackexchange.com/questions/422966/which-characters-are-technically-legal-in-macro-names-with-t1
macro_name
    = $("\\"[a-zA-Z]+)
    / $("\\"![a-zA-Z] .)

token
    = macro_name / non_brace

token_or_whitespace
	= token / whitespace_token

// No need to separate individual characters here, just need to trim enclosing whitespaces
group
    = x:braced_group { return x.map(arrayContent).join('').trim(); }

token_or_group
    = token / group

// Collections are "groups with one level deep", and are used in `e,E`.
// Whitespaces are ignored in e{***}, e.g. e{^ _} is the same as e{^_}.
collection
    = "{" content:(whitespace @token_or_group whitespace)* "}" { return content; }

token_or_collection
    = x:token { return [x]; }
    / collection

whitespace = whitespace_token* { return ""; }

whitespace_token
    = " "
    / "\n"
    / "\r"
