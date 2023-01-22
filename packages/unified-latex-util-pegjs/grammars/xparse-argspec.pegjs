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
    = "D" braceSpec:brace_spec defaultArg:braced_group {
            return createNode("optional", { ...braceSpec, defaultArg });
        }
    / "d" braceSpec:brace_spec { return createNode("optional", braceSpec); }

optional_star = "s" { return createNode("optionalStar"); }

optional_standard
    = "O" g:braced_group { return createNode("optional", { defaultArg: g }); }
    / "o" { return createNode("optional"); }

optional_embellishment
    = "e" args:braced_group {
            return createNode("embellishment", {
                embellishmentTokens: args.content,
            });
        }
    / "E" args:braced_group g:braced_group {
            return createNode("embellishment", {
                embellishmentTokens: args.content,
                defaultArg: g,
            });
        }

optional_token
    = "t" tok:. { return createNode("optionalToken", { token: tok }); }

// Required arguments
required
    = "R" braceSpec:brace_spec defaultArg:braced_group {
            return createNode("mandatory", { ...braceSpec, defaultArg });
        }
    / "r" braceSpec:brace_spec { return createNode("mandatory", braceSpec); }

// An "until" argument gobbles tokens until the specified stop token(s)
until
    = "u" stopTokens:until_stop_token {
            return createNode("until", { stopTokens });
        }

until_stop_token
    = ![{ ] x:. { return [x]; }
    / g:braced_group { return g.content; }

// A mandatory argument is a required argument with the default braces {...}
mandatory = "m" { return createNode("mandatory"); }

// Used to specify a pair of opening and closing braces
brace_spec
    = openBrace:$(!whitespace_token .)? closeBrace:$(!whitespace_token .)? {
            return { openBrace, closeBrace };
        }

braced_group
    = "{" content:($(!"}" !braced_group .) / braced_group)* "}" {
            return { type: "group", content: content };
        }

whitespace = whitespace_token* { return ""; }

whitespace_token
    = " "
    / "\n"
    / "\r"
