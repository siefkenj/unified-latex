import { Plugin, Parser, unified } from "unified";
import { environmentInfo, macroInfo } from "@unified-latex/unified-latex-ctan";
import * as Ast from "@unified-latex/unified-latex-types";
import {
    EnvInfoRecord,
    MacroInfoRecord,
} from "@unified-latex/unified-latex-types";
import {
    unifiedLatexTrimEnvironmentContents,
    unifiedLatexTrimRoot,
} from "@unified-latex/unified-latex-util-trim";
import { unifiedLatexAstComplier } from "./compiler-ast";
import { unifiedLatexFromStringMinimal } from "./plugin-from-string-minimal";
import { unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse } from "./process-macros-and-environments";
import { unifiedLatexProcessAtLetterAndExplMacros } from "./process-at-letter-and-expl-macros";

export type PluginOptions =
    | {
          mode?: "math" | "regular";
          macros?: MacroInfoRecord;
          environments?: EnvInfoRecord;
          flags?: {
              /**
               * Whether to parse macros as if `\makeatletter` is set (i.e., parse `@` as a regular macro character)
               */
              atLetter?: boolean;
              /**
               * Whether to parse macros as if `\ExplSyntaxOn` is set (i.e., parse `_` and `:` as a regular macro character)
               */
              expl3?: boolean;
              /**
               * Attempt to autodetect whether there are macros that look like they should contain `@`, `_`, or `:`.
               * Defaults to `false`.
               */
              autodetectExpl3AndAtLetter?: boolean;
          };
      }
    | undefined;

/**
 * Parse a string to a LaTeX AST.
 */
export const unifiedLatexFromString: Plugin<PluginOptions[], string, Ast.Root> =
    function unifiedLatexFromString(options) {
        const {
            mode = "regular",
            macros = {},
            environments = {},
            flags: {
                atLetter = false,
                expl3 = false,
                autodetectExpl3AndAtLetter = false,
            } = {},
        } = options || {};

        // Build up a parsing plugin with only unified components
        const allMacroInfo: MacroInfoRecord = Object.assign(
            {},
            macros,
            ...Object.values(macroInfo)
        );
        const allEnvInfo: EnvInfoRecord = Object.assign(
            {},
            environments,
            ...Object.values(environmentInfo)
        );

        // Build up a parser that will perform all the needed steps
        const fullParser = unified()
            .use(unifiedLatexFromStringMinimal, { mode })
            .use(unifiedLatexProcessAtLetterAndExplMacros, {
                atLetter,
                expl3,
                autodetectExpl3AndAtLetter,
            })
            // Math environments that aren't hardcoded into the PEG grammar need to be re-parsed,
            // so do a minimal pass first with just those environments.
            .use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
                macros: allMacroInfo,
                environments: allEnvInfo,
            })
            .use(unifiedLatexTrimEnvironmentContents)
            .use(unifiedLatexTrimRoot)
            .use(unifiedLatexAstComplier);

        const parser: Parser<Ast.Root> = (str) => {
            const file = fullParser.processSync({ value: str });
            return file.result;
        };

        Object.assign(this, { Parser: parser });
    };
