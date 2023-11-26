// globalThis polyfill from https://mathiasbynens.be/notes/globalthis
(function () {
    if (typeof globalThis === "object") {
        return;
    }
    Object.defineProperty(Object.prototype, "__magic__", {
        get: function () {
            return this;
        },
        configurable: true, // This makes it possible to `delete` the getter later.
    });
    __magic__.globalThis = __magic__; // lolwat
    delete Object.prototype.__magic__;
})();

const clone =
    typeof globalThis.structuredClone === "function"
        ? globalThis.structuredClone
        : (obj: any) => JSON.parse(JSON.stringify(obj));

/**
 * Wrapper around the built-in structured clone. Uses `JSON.parse(JSON.stringify(...))`
 * as a fallback.
 */
export function structuredClone<T>(obj: T): T {
    return clone(obj);
}
(
declare global {
    const __magic__: any;
    interface Object {
        __magic__?: any;
    }
}
