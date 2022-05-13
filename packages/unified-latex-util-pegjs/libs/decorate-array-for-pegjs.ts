type StringlikeArray = any[] & string;

/**
 * Pegjs operates on strings. However, strings and arrays are very similar!
 * This function adds `charAt`, `charCodeAt`, and `substring` methods to
 * `array` so that `array` can then be fed to a Pegjs generated parser.
 *
 * @param {[object]} array
 * @returns {[object]}
 */
export function decorateArrayForPegjs(array: any[]): StringlikeArray {
    (array as any).charAt = function (i: number) {
        return this[i];
    };
    // We don't have a hope of imitating `charCodeAt`, so
    // make it something that won't interfere
    (array as any).charCodeAt = () => 0;
    (array as any).substring = function (i: number, j: number) {
        return this.slice(i, j);
    };
    // This function is called when reporting an error,
    // so we convert back to a string.
    (array as any).replace = function (a: string, b: string) {
        const ret = JSON.stringify(this);
        return ret.replace(a, b);
    };
    return array as StringlikeArray;
}
