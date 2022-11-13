import * as Ast from "@unified-latex/unified-latex-types";
import {
    EnvInfo,
    MacroInfo,
    MacroInfoRecord,
} from "@unified-latex/unified-latex-types";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * Creates a macro matching function that uses a `SpecialMacroSpec` or list of macros
 * and generates a hash for quick lookup.
 */
function createMacroMatcher<S extends string>(
    macros: Ast.Macro[] | S[] | Record<S, unknown>
) {
    // We first make sure we have a record type with keys being the macro's contents
    const macrosHash: Record<string, unknown> = Array.isArray(macros)
        ? macros.length > 0
            ? typeof macros[0] === "string"
                ? Object.fromEntries(
                      macros.map((macro) => {
                          if (typeof macro !== "string") {
                              throw new Error("Wrong branch of map function");
                          }
                          return [macro, {}] as [string, MacroInfo];
                      })
                  )
                : Object.fromEntries(
                      macros.map((macro) => {
                          if (typeof macro === "string") {
                              throw new Error("Wrong branch of map function");
                          }
                          if (macro.escapeToken != null) {
                              return [
                                  macro.content,
                                  { escapeToken: macro.escapeToken },
                              ] as [string, MacroInfo];
                          }
                          return [macro.content, {}] as [string, MacroInfo];
                      })
                  )
            : {}
        : macros;

    return function matchAgainstMacros(node: any | Ast.Macro) {
        if (node == null || node.type !== "macro") {
            return false;
        }
        // At this point we have a macro type
        const spec = macrosHash[node.content];
        if (!spec) {
            return false;
        }

        if (typeof spec === "object" && "escapeToken" in spec) {
            return (
                (spec as MacroInfoRecord).escapeToken == null ||
                (spec as MacroInfoRecord).escapeToken === node.escapeToken
            );
        }
        return true;
    } as Ast.TypeGuard<Ast.Macro & { content: S }>;
}

/**
 * Creates a macro matching function that uses a `SpecialMacroSpec` or list of macros
 * and generates a hash for quick lookup.
 */
function createEnvironmentMatcher(macros: string[] | Record<string, unknown>) {
    // We first make sure we have a record type with keys being the macro's contents
    const environmentsHash = Array.isArray(macros)
        ? Object.fromEntries(
              macros.map((str) => {
                  return [str, {}] as [string, EnvInfo];
              })
          )
        : macros;

    return function matchAgainstEnvironments(node: any | Ast.Environment) {
        if (!match.anyEnvironment(node)) {
            return false;
        }
        // At this point we have an environment type
        const envName = printRaw(node.env);
        const spec = environmentsHash[envName];
        if (!spec) {
            return false;
        }

        return true;
    } as Ast.TypeGuard<Ast.Environment>;
}

/**
 * Functions to match different types of nodes.
 */
export const match = {
    macro(node: any, macroName?: string): node is Ast.Macro {
        if (node == null) {
            return false;
        }
        return (
            node.type === "macro" &&
            (macroName == null || node.content === macroName)
        );
    },
    anyMacro(node: any): node is Ast.Macro {
        return match.macro(node);
    },
    environment(node: any, envName?: string): node is Ast.Environment {
        if (node == null) {
            return false;
        }
        return (
            (node.type === "environment" || node.type === "mathenv") &&
            (envName == null || printRaw(node.env) === envName)
        );
    },
    anyEnvironment(node: any): node is Ast.Environment {
        return match.environment(node);
    },
    comment(node: any): node is Ast.Comment {
        if (node == null) {
            return false;
        }
        return node.type === "comment";
    },
    parbreak(node: any): node is Ast.Parbreak {
        if (node == null) {
            return false;
        }
        return node.type === "parbreak";
    },
    whitespace(node: any): node is Ast.Whitespace {
        if (node == null) {
            return false;
        }
        return node.type === "whitespace";
    },
    /**
     * Matches whitespace or a comment with leading whitespace.
     */
    whitespaceLike(
        node: any
    ): node is Ast.Whitespace | (Ast.Comment & { leadingWhitespace: true }) {
        if (node == null) {
            return false;
        }
        return (
            node.type === "whitespace" ||
            (node.type === "whitespace" && node.leadingWhitespace === true)
        );
    },
    string(node: any, value?: string): node is Ast.String {
        if (node == null) {
            return false;
        }
        return (
            node.type === "string" && (value == null || node.content === value)
        );
    },
    anyString(node: any): node is Ast.String {
        return match.string(node);
    },
    group(node: any): node is Ast.Group {
        if (node == null) {
            return false;
        }
        return node.type === "group";
    },
    argument(node: any): node is Ast.Argument {
        if (node == null) {
            return false;
        }
        return node.type === "argument";
    },
    blankArgument(node: any): boolean {
        if (!match.argument(node)) {
            return false;
        }
        return (
            node.openMark === "" &&
            node.closeMark === "" &&
            node.content.length === 0
        );
    },
    math(node: any): node is Ast.DisplayMath | Ast.InlineMath {
        if (node == null) {
            return false;
        }
        return node.type === "displaymath" || node.type === "inlinemath";
    },
    createMacroMatcher,
    createEnvironmentMatcher,
};
