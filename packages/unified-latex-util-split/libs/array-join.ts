/**
 * Joins an array of arrays with the item `sep`
 */
export function arrayJoin<T>(array: T[][], sep: T | T[]): T[] {
    return array.flatMap((item, i) => {
        if (i === 0) {
            return item;
        }
        if (Array.isArray(sep)) {
            return [...sep, ...item];
        } else {
            return [sep, ...item];
        }
    });
}
