import * as Ast from "./ast-types";

export type EnvInfo = {
    renderInfo?: {
        /**
         * Whether the body of the environment should be treated as math mode
         *
         * @type {boolean}
         */
        inMathMode?: boolean;
        /**
         * Whether to align the environment contents based on `&` and `\\` delimiters
         * (like a matrix or tabular environment).
         *
         * @type {boolean}
         */
        alignContent?: boolean;
        /**
         * Whether the arguments should be treated as pgfkeys-type arguments.
         *
         * @type {boolean}
         */
        pgfkeysArgs?: boolean;
        /**
         * A list of names to be given to each argument when processing. This list should
         * be the same length as the number of arguments. `null` can appear any number of times
         * for "un-named" arguments.
         *
         * This allows a consistent reference to macro arguments even if the macro signatures are redefined between
         * packages.
         *
         * @type {((string|null)[])}
         */
        namedArguments?: (string | null)[];
        /**
         * Whether the body is tikz-environment like (e.g., a `tikzpicture` or `scope`, etc.)
         *
         * @type {boolean}
         */
        tikzEnvironment?: boolean;
    };
    /**
     * Function to process the body of an environment. The return value of `processContent`
     * is treated as the new body.
     *
     */
    processContent?: (ast: Ast.Node[]) => Ast.Node[];
    /**
     * The environment signature as an xparse argument specification string.
     *
     * @type {string}
     */
    signature?: string;
};

export type MacroInfo = {
    renderInfo?: {
        /**
         * Whether the macro's contents wraps along with the current
         * paragraph or displays as it's own block.
         *
         * @type {boolean}
         */
        inParMode?: boolean;
        /**
         * Whether the arguments should be processed as pgfkeys-type arguments.
         *
         * @type {boolean}
         */
        pgfkeysArgs?: boolean;
        /**
         * Whether there should be line breaks before and after the macro
         * (e.g., like the \section{...} command.)
         *
         * @type {boolean}
         */
        breakAround?: boolean;
        /**
         * Whether the contents of the macro should be assumed to be in math mode.
         *
         * @type {boolean}
         */
        inMathMode?: boolean;
        /**
         * Whether the arguments should be rendered with a hanging indent when the wrap
         * (like the arguments to \item in an enumerate environment.)
         *
         * @type {boolean}
         */
        hangingIndent?: boolean;
        /**
         * A list of names to be given to each argument when processing. This list should
         * be the same length as the number of arguments. `null` can appear any number of times
         * for "un-named" arguments.
         *
         * This allows a consistent reference to macro arguments even if the macro signatures are redefined between
         * packages.
         *
         * @type {((string|null)[])}
         */
        namedArguments?: (string | null)[];
        /**
         * Whether the macro represents a tikz path command (e.g. `\draw (0,0) -- (1,1);`).
         *
         * @type {boolean}
         */
        tikzPathCommand?: boolean;
    };
    /**
     * The macro signature as an xparse argument specification string.
     *
     * @type {string}
     */
    signature?: string;
    /**
     * Some special macros like `^` and `_` don't use
     * an escape token. When matching against these macros,
     * care must be taken to match the macro contents and the macro's
     * escape token.
     */
    escapeToken?: string;
};

export type EnvInfoRecord = Record<string, EnvInfo>;
export type MacroInfoRecord = Record<string, MacroInfo>;
