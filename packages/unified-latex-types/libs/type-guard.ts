/**
 * Generic type of a type-guard function.
 */
export interface TypeGuard<T> {
    (node: any): node is T;
}
