import { environmentInfo, macroInfo } from "@unified-latex/unified-latex-ctan";
import {
    EnvInfoRecord,
    MacroInfoRecord,
} from "@unified-latex/unified-latex-types";

/**
 * The info for all macros and environments from `@unified-latex/unified-latex-ctan`, with
 * `macros` and `environments` taking precedence.
 */
export function withCtanInfo(
    macros: MacroInfoRecord = {},
    environments: EnvInfoRecord = {}
): { macros: MacroInfoRecord; environments: EnvInfoRecord } {
    return {
        macros: Object.assign({}, ...Object.values(macroInfo), macros),
        environments: Object.assign(
            {},
            ...Object.values(environmentInfo),
            environments
        ),
    };
}

/**
 * The info for `key` in `record` (e.g., a `MacroInfoRecord`), ignoring inherited properties
 * (e.g., `constructor`, which would otherwise be found for `\begin{constructor}`).
 */
export function ownProperty<T>(
    record: Record<string, T>,
    key: string
): T | undefined {
    return Object.prototype.hasOwnProperty.call(record, key)
        ? record[key]
        : undefined;
}
