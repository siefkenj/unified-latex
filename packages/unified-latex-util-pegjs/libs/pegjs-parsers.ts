// This file needs to be here because typescript does not know how to use babel's transpiler
// to directly load Pegjs grammars.
// @ts-nocheck
import _LatexPegParser from "../grammars/latex.pegjs";
import _AlignEnvironmentPegParser from "../grammars/align-environment.pegjs";
import _ArgSpecPegParser from "../grammars/xparse-argspec.pegjs";
import _PgfkeysPegParser from "../grammars/pgfkeys.pegjs";
import _MacroSubstitutionPegParser from "../grammars/macro-substitutions.pegjs";
import _LigaturesPegParser from "../grammars/ligatures.pegjs";
import _XColorPegParser from "../grammars/xcolor-expressions.pegjs";
import _TabularPegParser from "../grammars/tabular-spec.pegjs";
import _SystemePegParser from "../grammars/systeme-environment.pegjs";
import _GluePegParser from "../grammars/tex-glue.pegjs";

type PegParser = {
    parse: (input: string | unknown[], options?: unknown) => any;
    SyntaxError: (
        message: string,
        expected: string,
        found: unknown,
        location: unknown
    ) => unknown;
};

const LatexPegParser = _LatexPegParser as PegParser;
const AlignEnvironmentPegParser = _AlignEnvironmentPegParser as PegParser;
const ArgSpecPegParser = _ArgSpecPegParser as PegParser;
const PgfkeysPegParser = _PgfkeysPegParser as PegParser;
const MacroSubstitutionPegParser = _MacroSubstitutionPegParser as PegParser;
const LigaturesPegParser = _LigaturesPegParser as PegParser;
const XColorPegParser = _XColorPegParser as PegParser;
const TabularPegParser = _TabularPegParser as PegParser;
const SystemePegParser = _SystemePegParser as PegParser;
const GluePegParser = _GluePegParser as PegParser;

export {
    LatexPegParser,
    AlignEnvironmentPegParser,
    ArgSpecPegParser,
    PgfkeysPegParser,
    MacroSubstitutionPegParser,
    LigaturesPegParser,
    XColorPegParser,
    TabularPegParser,
    SystemePegParser,
    GluePegParser,
};
