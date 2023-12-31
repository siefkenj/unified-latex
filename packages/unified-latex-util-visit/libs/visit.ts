import * as Ast from "@unified-latex/unified-latex-types";
import { listMathChildren } from "./list-math-children";

export type VisitorContext = {
    /**
     * Whether the node is being processed in math mode.
     *
     * This happens when the node is a director or indirect child
     * of a math environment (e.g. `$abc$`), but not when an environment
     * re-establishes text mode (e.g. `$\text{abc}$`)
     */
    inMathMode?: boolean;
    /**
     * Whether the node has any ancestor that is processed in math mode.
     */
    hasMathModeAncestor?: boolean;
};

type GetGuard<T> = T extends (x: any, ...y: any[]) => x is infer R ? R : never;
/**
 * Gets the type that a type-guard function is guarding. If
 * the guard type cannot be determined, the input type is returned.
 */
type GuardTypeOf<T extends (x: any, ...y: any[]) => boolean> =
    GetGuard<T> extends never
        ? T extends (x: infer A) => any
            ? A
            : never
        : GetGuard<T>;

/**
 * Extracts the guard type from the `test` function provided in a
 * `VisitOptions` argument.
 */
type GuardFromOptions<
    Opts extends VisitOptions,
    PossibleTypes = Ast.Ast,
> = Opts extends {
    test: infer R;
}
    ? R extends (x: any, ...y: any[]) => boolean
        ? // A guard like `typeof Array.isArray` will return `any[]` as the type.
          // This type cannot be narrowed, so instead we use it to pick from
          // the set of all possible types.
          Extract<PossibleTypes, GuardTypeOf<R>>
        : PossibleTypes
    : PossibleTypes;

/**
 * Narrow the type `T` based on the `VisitOptions` supplied. If `{includeArrays: false}`
 * is specified in the `VisitOptions`, then arrays are excluded from `T`.
 */
type NarrowArraysBasedOnOptions<T, Opts extends VisitOptions> = Opts extends {
    includeArrays: infer A;
}
    ? A extends true
        ? T
        : Exclude<T, any[]>
    : Exclude<T, any[]>;

/**
 * Get the type of the parameter to the `Visitor` function based on the
 * `VisitOptions` that are supplied.
 */
type VisitorTypeFromOptions<Opts extends VisitOptions> =
    NarrowArraysBasedOnOptions<GuardFromOptions<Opts>, Opts>;

/**
 * Continue traversing as normal
 */
export const CONTINUE = Symbol("continue");
/**
 * Do not traverse this node’s children
 */
export const SKIP = Symbol("skip");
/**
 * Stop traversing immediately
 */
export const EXIT = Symbol("exit");

type Action = typeof CONTINUE | typeof SKIP | typeof EXIT;
type Index = number;
type ActionTuple = [Action] | [typeof SKIP, Index] | [typeof CONTINUE, Index];

/**
 * A visitor takes a `node`, `key`, `index`, and ...
 *
 * @param key - The key of the parent that we were accessed through.
 */
type Visitor<T> = (
    node: T,
    info: VisitInfo
) => null | undefined | Action | Index | ActionTuple | void;
type Visitors<T> = { enter?: Visitor<T>; leave?: Visitor<T> };

type VisitOptions = {
    startingContext?: VisitorContext;
    /**
     * Type guard for types that are passed to the `visitor` function.
     */
    test?: (node: Ast.Ast, info: VisitInfo) => boolean;
    /**
     * Whether arrays will be sent to the `visitor` function. If falsy,
     * only nodes will be past to `visitor`.
     */
    includeArrays?: boolean;
};

const DEFAULT_CONTEXT: VisitorContext = {
    inMathMode: false,
    hasMathModeAncestor: false,
};

export type VisitInfo = {
    /**
     * If the element was accessed via an attribute, the attribute key is specified.
     */
    readonly key: string | undefined;
    /**
     * If the element was accessed in an array, the index is specified.
     */
    readonly index: number | undefined;
    /**
     * A list of ancestor nodes, `[parent, grandparent, great-grandparent, ...]`
     */
    readonly parents: (Ast.Node | Ast.Argument)[];
    /**
     * If the element was accessed in an array, the array that it is part of.
     */
    readonly containingArray: (Ast.Node | Ast.Argument)[] | undefined;
    /**
     * The LaTeX context of the current match.
     */
    readonly context: VisitorContext;
};

/**
 * Visit children of tree which pass a test
 *
 * @param {Node} tree Abstract syntax tree to walk
 * @param {Visitor|Visitors} [visitor] Function to run for each node
 */
export function visit<Opts extends VisitOptions>(
    tree: Ast.Ast,
    visitor:
        | Visitor<VisitorTypeFromOptions<Opts>>
        | Visitors<VisitorTypeFromOptions<Opts>>,
    options?: Opts
) {
    const {
        startingContext = DEFAULT_CONTEXT,
        test = () => true,
        includeArrays = false,
    } = options || {};
    let enter: Visitor<VisitorTypeFromOptions<Opts>> | undefined;
    let leave: Visitor<VisitorTypeFromOptions<Opts>> | undefined;

    if (typeof visitor === "function") {
        enter = visitor;
    } else if (visitor && typeof visitor === "object") {
        enter = visitor.enter;
        leave = visitor.leave;
    }

    walk(tree, {
        key: undefined,
        index: undefined,
        parents: [],
        containingArray: undefined,
        context: { ...startingContext },
    });

    /**
     * @param {Node} node
     * @param {string?} key
     * @param {number?} index
     * @param {Array.<Node>} parents
     */
    function walk(
        node: Ast.Ast,
        { key, index, parents, context, containingArray }: VisitInfo
    ): ActionTuple {
        const nodePassesTest = includeArrays
            ? test(node, { key, index, parents, context, containingArray })
            : !Array.isArray(node) &&
              test(node, { key, index, parents, context, containingArray });

        const result: ActionTuple =
            enter && nodePassesTest
                ? toResult(
                      enter(node as any, {
                          key,
                          index,
                          parents,
                          context,
                          containingArray,
                      })
                  )
                : [CONTINUE];

        if (result[0] === EXIT) {
            return result;
        }

        if (result[0] === SKIP) {
            return leave && nodePassesTest
                ? toResult(
                      leave(node as any, {
                          key,
                          index,
                          parents,
                          context,
                          containingArray,
                      })
                  )
                : result;
        }

        if (Array.isArray(node)) {
            // The `value` array might be modified in place as we traverse it, so
            // we use a traditional for loop.
            for (let index = 0; index > -1 && index < node.length; index++) {
                const item = node[index];
                const result = walk(item, {
                    key,
                    index,
                    parents,
                    context,
                    containingArray: node,
                });
                if (result[0] === EXIT) {
                    return result;
                }
                if (typeof result[1] === "number") {
                    // The for loop will increment i every pass. However,
                    // if an index was returned, that's where we want to start next time.
                    index = result[1] - 1;
                }
            }
        } else {
            // We don't want to recursively apply to the `content`
            // of all types (e.g., comments and macros), so specify
            // a blacklist.
            let childProps: ("content" | "args")[] = ["content", "args"];
            switch (node.type) {
                case "macro":
                    childProps = ["args"];
                    break;
                case "comment":
                case "string":
                case "verb":
                case "verbatim":
                    childProps = [];
                    break;
                default:
                    break;
            }

            const mathModeProps = listMathChildren(node);
            for (const key of childProps) {
                const value = node[key as keyof typeof node] as
                    | Ast.Ast
                    | undefined;
                const grandparents = [node].concat(parents);

                if (value == null) {
                    continue;
                }

                // We may switch in/out of math mode as we pass to node[key]
                const newContext = { ...context };
                if (mathModeProps.enter.includes(key)) {
                    newContext.inMathMode = true;
                    newContext.hasMathModeAncestor = true;
                } else if (mathModeProps.leave.includes(key)) {
                    newContext.inMathMode = false;
                }

                const result = walk(value, {
                    key,
                    index: undefined,
                    parents: grandparents,
                    context: newContext,
                    containingArray: undefined,
                });
                if (result[0] === EXIT) {
                    return result;
                }
            }
        }

        return leave && nodePassesTest
            ? toResult(
                  leave(node as any, {
                      key,
                      index,
                      parents,
                      context,
                      containingArray,
                  })
              )
            : result;
    }
}

/**
 * Ensures a result is an `ActionTuple`s
 */
function toResult(
    value: null | undefined | void | Action | Index | ActionTuple
): ActionTuple {
    if (value == null) {
        return [CONTINUE];
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "number") {
        return [CONTINUE, value];
    }

    return [value];
}
