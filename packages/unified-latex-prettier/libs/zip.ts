export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
    const ret: [T, U][] = [];
    const len = Math.min(array1.length, array2.length);
    for (let i = 0; i < len; i++) {
        ret.push([array1[i], array2[i]]);
    }
    return ret;
}
