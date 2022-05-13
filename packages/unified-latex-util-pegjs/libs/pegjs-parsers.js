// This file needs to be here because typescript does not know how to use babel's transpiler
// to directly load Pegjs grammars.
import LatexPegParser from "../grammars/latex.pegjs";
import AlignEnvironmentPegParser from "../grammars/align-environment.pegjs";
import ArgSpecPegParser from "../grammars/xparse-argspec.pegjs";
import PgfkeysPegParser from "../grammars/pgfkeys.pegjs";
import MacroSubstitutionPegParser from "../grammars/macro-substitutions.pegjs";
import LigaturesPegParser from "../grammars/ligatures.pegjs";
import XColorPegParser from "../grammars/xcolor-expressions.pegjs";
import TabularPegParser from "../grammars/tabular-spec.pegjs";
import SystemePegParser from "../grammars/systeme-environment.pegjs";
import GluePegParser from "../grammars/tex-glue.pegjs";

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
