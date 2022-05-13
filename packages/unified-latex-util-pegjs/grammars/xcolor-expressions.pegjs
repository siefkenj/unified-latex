// Grammar for the xcolor package's color specification format.
// Based on the grammar sepcified in http://mirrors.ctan.org/macros/latex/contrib/xcolor/xcolor.pdf

start
    = m:spec EOL { return m; }
    / m:spec_list EOL { return m; }
    / m:color EOL { return m; }
    / m:model_list EOL { return m; }
    / m:color_set_spec EOL { return m; }
    / a:$.* { return { type: "invalid_spec", content: a }; }
    / EOL

color_set_spec
    = f:color_set_item r:(";" c:color_set_item { return c; })* {
            return { type: "color_set", content: [f].concat(r) };
        }

color_set_item
    = n:name "," s:spec_list {
            return { type: "color_set_item", name: n, spec_list: s };
        }

model_list "model list"
    = c:core_model ":" m:model_list_tail {
            return { type: "model_list", contents: m, core_model: c };
        }
    / m:model_list_tail {
            return { type: "model_list", contents: m, core_model: null };
        }

model_list_tail
    = m:model r:("/" a:model { return a; })* { return [m].concat(r); }

model "model" = core_model

spec_list "color spec list"
    = s:spec r:("/" a:spec { return a; })* {
            return { type: "spec_list", content: [s].concat(r) };
        }

spec "color spec"
    = c:$(hex hex hex hex hex hex) {
            return { type: "hex_spec", content: [c] };
        }
    / c:dec r:(("," d:dec { return d; })+ / (sp d:dec { return d; })+)? {
            return { type: "num_spec", content: r ? [c].concat(r) : [c] };
        }

color "color"
    = c:color_expr fs:func_expr* {
            return { type: "color", color: c, functions: fs };
        }

color_expr
    = ext_expr
    / expr
    / name

func_expr "function expression"
    = ">" f:function args:("," n:int { return n; })* {
            return { type: "function", name: f, args };
        }

function "function" = name

ext_expr "extended expression"
    = core:core_model
        ","
        d:div
        ":"
        e:weighted_expr
        es:additional_weighted_expr* {
            return {
                type: "extended_expr",
                core_model: core,
                div: d,
                expressions: [e].concat(es),
            };
        }
    / core:core_model ":" e:weighted_expr es:additional_weighted_expr* {
            return {
                type: "extended_expr",
                core_model: core,
                div: null,
                expressions: [e].concat(es),
            };
        }

weighted_expr
    = e:expr "," d:dec {
            return { type: "weighted_expr", color: e, weight: d };
        }

additional_weighted_expr = ";" e:weighted_expr { return e; }

core_model "core model" = name

expr "expr"
    = p:prefix? n:name e:mix_expr? po:postfix? {
            return {
                type: "expr",
                prefix: p,
                name: n,
                mix_expr: e,
                postfix: po,
            };
        }

complete_mix
    = "!" p:pct "!" n:name {
            return { type: "complete_mix", mix_percent: p, name: n };
        }

partial_mix = "!" p:pct { return { type: "partial_mix", mix_percent: p }; }

mix_expr "mix expr"
    = c:complete_mix* p:partial_mix? { return c.concat(p || []); }

name "name"
    = "."
    / $[a-zA-Z0-9]+

postfix "postfix"
    = "!![" n:num "]" { return { type: "postfix", num: n }; }
    / "!!" p:$plus+ { return { type: "postfix", plusses: p }; }

prefix "prefix" = minus?

plus "plus" = $"+"+

minus "minus" = $"-"+

num "num" = n:$[0-9]+ { return parseInt(n, 10); }

pct "positive float"
    = n:($($[0-9]+ $("." $[0-9]*)?) / $("." $[0-9]+)) { return parseFloat(n); }

div "divisor" = pct

dec
    = pct
    / "+" n:pct { return n; }
    / "-" n:pct { return -n; }

int "int" = m:minus? n:num { return m ? -n : n; }

_ "whitespace" = [ \t\n\r]*

sp = [ \t\n\r]+

hex = h:[0-9a-fA-F] { return h.toUpperCase(); }

EOL = !.
