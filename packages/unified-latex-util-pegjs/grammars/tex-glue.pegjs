//
// A PEG grammar for processing TeX glue. E.g. "1pt plus 2.5in minus 3fil".
// This grammar assumes that all whitespace and comments have been stripped.
//
root
    = glue:(
            b:base st:stretchable? sh:shrinkable? {
                    // Only return the non-null glue items
                    return {
                        type: "glue",
                        fixed: b,
                        stretchable: st,
                        shrinkable: sh,
                        position: location(),
                    };
                }
        )
        .* { return glue; }

base = n:number u:unit { return { type: "dim", value: n, unit: u }; }

stretchable
    = "plus" n:number u:rubber_unit {
            return { type: "dim", value: n, unit: u };
        }

shrinkable
    = "minus" n:number u:rubber_unit {
            return { type: "dim", value: n, unit: u };
        }

unit
    = "pt"
    / "mm"
    / "cm"
    / "in"
    / "ex"
    / "em"
    / "bp"
    / "pc"
    / "dd"
    / "cc"
    / "nd"
    / "nc"
    / "sp"

rubber_unit
    = unit
    / "filll"
    / "fill"
    / "fil"

number "number"
    = n:$(sign? ([0-9]* "." [0-9]+ / [0-9]+)) { return parseFloat(n); }

sign
    = "+"
    / "-"

EOL = !.
