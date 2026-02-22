import type { EnvInfo, MacroInfo } from "@unified-latex/unified-latex-types";
import "@unified-latex/unified-latex-types";

declare module "@unified-latex/unified-latex-types" {
    interface EnvRenderInfo {
        /**
         * Object of additional attributes that will be added to the environment's node when processing.
         * Used for things like migrating \label to xml:id attributes, or any other situation where
         * an attribute must be inferred from nearby macros/elements.
         *
         * @type {Record<string, string>}
         */
        additionalAttributes?: Record<string, string>;
    }

    interface MacroRenderInfo {
        /**
         * Object of additional attributes that will be added to the macro's node when processing.
         * Used for things like migrating \label to xml:id attributes,
         * or any other situation where we need to parse nearby content to add to the attributes
         * (instead of just the macro's given arguments)
         *
         * @type {Record<string, string>}
         */
        additionalAttributes?: Record<string, string>;
    }
}

export type PretextEnvInfoRecord = Record<string, EnvInfo>;
export type PretextMacroInfoRecord = Record<string, MacroInfo>;
