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
     * Convert a group to a string, preserving {} braces.
     */
    function groupToStr(node) {
        if (typeof node !== "object" || !node) {
            return node;
        }
        if (node.type === "group") {
            return `{${node.content.map(groupToStr).join("")}}`;
        }
        return node;
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
    = "D" braceSpec:brace_spec defaultArg:arg {
            return createNode("optional", { ...braceSpec, defaultArg });
        }
    / "d" braceSpec:brace_spec { return createNode("optional", braceSpec); }

optional_star = "s" { return createNode("optionalStar"); }

optional_standard
    = "O" whitespace g:arg { return createNode("optional", { defaultArg: g }); }
    / "o" { return createNode("optional"); }

optional_embellishment
    = "e" whitespace args:args {
            return createNode("embellishment", {
                embellishmentTokens: args,
            });
        }
    / "E" whitespace args:args whitespace g:args {
            return createNode("embellishment", {
                embellishmentTokens: args,
                defaultArg: g,
            });
        }

optional_token
    = "t" tok:. { return createNode("optionalToken", { token: tok }); }

// Required arguments
required
    = "R" braceSpec:brace_spec defaultArg:arg {
            return createNode("mandatory", { ...braceSpec, defaultArg });
        }
    / "r" braceSpec:brace_spec { return createNode("mandatory", braceSpec); }

// An "until" argument gobbles tokens until the specified stop token(s)
until
    = "u" stopTokens:until_stop_token {
            return createNode("until", { stopTokens });
        }

//
// HELPER RULES
//

until_stop_token
    = ![{ ] x:. { return [x]; }
    / g:braced_group { return g.content; }

// A mandatory argument is a required argument with the default braces {...}
mandatory = "m" { return createNode("mandatory"); }

// Used to specify a pair of opening and closing braces
brace_spec
    = openBrace:$(!whitespace_token (macro / .))?
        closeBrace:$(!whitespace_token (macro / .))? {
            return { openBrace, closeBrace };
        }

// A `default_arg` is a braced group, but its content will be processed as a string (or array of strings).
// For example `{foo}` -> `["foo"]` and `{{foo}{bar}}` -> `["foo", "bar"]`
arg
    = token
    / g:braced_group { return g.content.map(groupToStr).join(""); }

args
    = t:token { return [t]; }
    / "{" args:(arg / whitespace_token)* "}" {
            return args.filter((a) => !a.match(/^\s*$/));
        }

braced_group
    = "{"
        content:(
            $(!"}" !braced_group (token / whitespace_token))
            / braced_group
        )*
        "}" { return { type: "group", content: content }; }

whitespace = whitespace_token* { return ""; }

whitespace_token
    = " "
    / "\n"
    / "\r"

macro
    = $("\\" [a-zA-Z]+)
    / $("\\" ![a-zA-Z] .)

token
    = macro
    / ![{}] !whitespace_token @.
