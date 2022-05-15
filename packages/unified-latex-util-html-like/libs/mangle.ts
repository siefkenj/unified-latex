/**
 * Convert `tag` into an escaped macro name.
 */
export function tagName(tag: string): string {
    return `html-tag:${tag}`;
}

/**
 * Convert `attribute` into an escaped macro name.
 */
export function attributeName(attribute: string): string {
    return `html-attr:${attribute}`;
}

/**
 * Extract a tag name from an escaped macro name.
 */
export function getTagNameFromString(tagName: string): string {
    const match = tagName.match(/:.*/);
    if (match) {
        return match[0].slice(1);
    }
    throw new Error(`Could not find tag name in ${tagName}`);
}

/**
 * Extract an attribute name from an escaped macro name.
 */
export function getAttributeNameFromString(tagName: string): string {
    const match = tagName.match(/:.*/);
    if (match) {
        return match[0].slice(1);
    }
    throw new Error(`Could not find attribute name in ${tagName}`);
}
