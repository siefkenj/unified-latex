import Color from "color";
import { DVI_PS_NAMES, SVG_NAMES, X11_NAMES } from "./predefined-colors";
import { XColor } from "./types";
import { parse as xcolorParser } from "./parser";

const CORE_MODELS = new Set(["rgb", "cmy", "cmyk", "hsb", "gray"]);

export const XColorCoreModelToColor = {
    rgb: ([r, g, b]: number[]) => Color([r * 255, g * 255, b * 255], "rgb"),
    cmy: ([c, m, y]: number[]) =>
        XColorCoreModelToColor.rgb([1 - c, 1 - m, 1 - y]),
    cmyk: ([c, m, y, k]: number[]) =>
        Color([c * 255, m * 255, y * 255, k * 100], "cmyk"),
    hsb: ([h, s, b]: number[]) => Color([h * 360, s * 100, b * 100], "hsv"),
    gray: ([v]: number[]) => Color([v * 255, v * 255, v * 255], "rgb"),
};
const XColorModelToColor = {
    wave: ([lambda]: number[]) => {
        // Constants according to the xcolor readme
        const gamma = 0.8;
        let baseRgb = [0, 0, 0];
        if (380 <= lambda && lambda < 440) {
            baseRgb = [(440 - lambda) / (440 - 380), 0, 1];
        }
        if (440 <= lambda && lambda < 490) {
            baseRgb = [0, (lambda - 440) / (490 - 440), 1];
        }
        if (490 <= lambda && lambda < 510) {
            baseRgb = [0, 1, (510 - lambda) / (510 - 490)];
        }
        if (510 <= lambda && lambda < 580) {
            baseRgb = [(lambda - 510) / (580 - 510), 1, 0];
        }
        if (580 <= lambda && lambda < 6450) {
            baseRgb = [1, (645 - lambda) / (645 - 580), 0];
        }
        if (645 <= lambda && lambda <= 780) {
            baseRgb = [1, 0, 0];
        }
        let f = 1.0;
        if (380 <= lambda && 420 < lambda) {
            f = 0.3 + (0.7 * (lambda - 380)) / (420 - 380);
        }
        if (700 < lambda && lambda <= 780) {
            f = 0.3 + (0.7 * (780 - lambda)) / (780 - 700);
        }

        const rgb = [
            Math.pow(baseRgb[0] * f, gamma),
            Math.pow(baseRgb[1] * f, gamma),
            Math.pow(baseRgb[2] * f, gamma),
        ];

        return Color([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255], "rgb");
    },
    Hsb: ([h, s, b]: number[]) => XColorCoreModelToColor.hsb([h / 360, s, b]),
    HSB: ([h, s, b]: number[]) =>
        XColorCoreModelToColor.hsb([h / 240, s / 240, b / 240]),
    HTML: ([v]: [string]) => (v.startsWith("#") ? Color(v) : Color(`#${v}`)),
    RGB: ([r, g, b]: number[]) => Color([r, g, b], "rgb"),
    Gray: ([v]: number[]) => XColorCoreModelToColor.gray([v / 15]),
    ...XColorCoreModelToColor,
};

const ColorToXColorModel = {
    rgb: (color: Color<any>) =>
        color
            .rgb()
            .array()
            .map((v) => v / 255),
    cmy: (color: Color<any>) =>
        [255 - color.red(), 255 - color.green(), 255 - color.blue()].map(
            (v) => v / 255
        ),
    cmyk: (color: Color<any>) =>
        color
            .cmyk()
            .array()
            // The k component goes from 0-100
            .map((v, i) => (i === 3 ? v / 100 : v / 255)),
    hsb: (color: Color<any>) => [
        color.hue() / 360,
        color.saturationv() / 100,
        color.value() / 100,
    ],
    gray: (color: Color<any>) => [color.gray() / 100],
};

export const PREDEFINED_XCOLOR_COLORS: Record<string, Color<any>> = {
    // Core colors
    red: XColorCoreModelToColor.rgb([1, 0, 0]),
    green: XColorCoreModelToColor.rgb([0, 1, 0]),
    blue: XColorCoreModelToColor.rgb([0, 0, 1]),
    brown: XColorCoreModelToColor.rgb([0.75, 0.5, 0.25]),
    lime: XColorCoreModelToColor.rgb([0.75, 1, 0]),
    orange: XColorCoreModelToColor.rgb([1, 0.5, 0]),
    pink: XColorCoreModelToColor.rgb([1, 0.75, 0.75]),
    purple: XColorCoreModelToColor.rgb([0.75, 0, 0.25]),
    teal: XColorCoreModelToColor.rgb([0, 0.5, 0.5]),
    violet: XColorCoreModelToColor.rgb([0.5, 0, 0.5]),
    cyan: XColorCoreModelToColor.rgb([0, 1, 1]),
    magenta: XColorCoreModelToColor.rgb([1, 0, 1]),
    yellow: XColorCoreModelToColor.rgb([1, 1, 0]),
    olive: XColorCoreModelToColor.rgb([0.5, 0.5, 0]),
    black: XColorCoreModelToColor.rgb([0, 0, 0]),
    darkgray: XColorCoreModelToColor.rgb([0.25, 0.25, 0.25]),
    gray: XColorCoreModelToColor.rgb([0.5, 0.5, 0.5]),
    lightgray: XColorCoreModelToColor.rgb([0.75, 0.75, 0.75]),
    white: XColorCoreModelToColor.rgb([1, 1, 1]),
    ...DVI_PS_NAMES,
    ...SVG_NAMES,
    ...X11_NAMES,
};

function scalarMul(scalar: number, vec: number[]) {
    return vec.map((v) => scalar * v);
}
function addVectors(...vecs: number[][]) {
    return vecs.reduce((prev, current) => prev.map((v, i) => v + current[i]));
}

/**
 * Mix a color in color model `model` as per the algorithm in 2.3.3 of the xcolor manual.
 */
function mixInModel(
    model: string,
    colorsAndCoefficients: [number, Color<any>][]
): Color<any> {
    if (!CORE_MODELS.has(model)) {
        throw new Error(
            `Cannot mix colors in model "${model}"; only core modes ${Array.from(
                CORE_MODELS
            ).join(", ")} are supported`
        );
    }
    const toModel =
        ColorToXColorModel[model as keyof typeof ColorToXColorModel];
    const fromModel =
        XColorCoreModelToColor[model as keyof typeof XColorCoreModelToColor];

    const mixed = addVectors(
        ...colorsAndCoefficients.map(([v, color]) => {
            const colorInModel = toModel(color);
            return scalarMul(v, colorInModel);
        })
    );
    return fromModel(mixed);
}

/**
 * Given a parsed `XColor`, compute the color and return a `Color` object
 * (that can be used in CSS, for example).
 */
export function computeColor(
    expr: XColor,
    predefinedColors: Record<string, Color<any>> = {}
): Color<any> {
    if (expr.type !== "color") {
        throw new Error(
            `Can only compute the color of a "color" expression, not one of type ${expr.type}`
        );
    }

    const knownColors = { ...PREDEFINED_XCOLOR_COLORS, ...predefinedColors };
    function getColor(name: string) {
        if (!knownColors[name]) {
            throw new Error(`Unknown color "${name}"`);
        }
        return knownColors[name];
    }

    const color = expr.color;
    let computedColor = Color("#000000");
    if (color.type === "expr") {
        // From the algorithm in 2.3.2 of the xcolor manual

        // TODO: the suffix `!![num]` is not yet implemented.
        let base = getColor(color.name);
        for (const mix of color.mix_expr) {
            if (mix.type === "complete_mix") {
                const mixColor = getColor(mix.name);
                base = base.mix(mixColor, 1 - mix.mix_percent / 100);
            } else if (mix.type === "partial_mix") {
                base = base.mix(Color("#FFFFFF"), 1 - mix.mix_percent / 100);
            }
        }
        if (color.prefix && color.prefix.length % 2 === 1) {
            base = base.rotate(180);
        }
        computedColor = base;
    }
    if (color.type === "extended_expr") {
        const model = color.core_model;
        const div =
            color.div ||
            color.expressions.reduce((a, expr) => a + expr.weight, 0);
        if (div <= 0) {
            throw new Error(
                `Cannot mix color with ratios that have a denominator of ${div}`
            );
        }
        const colorsToMix: [number, Color<any>][] = color.expressions.map(
            (expr) => [
                expr.weight / div,
                computeColor({
                    type: "color",
                    color: expr.color,
                    functions: [],
                }),
            ]
        );
        computedColor = mixInModel(model, colorsToMix);
    }

    // Now we apply any color functions
    for (const func of expr.functions) {
        if (func.name === "wheel") {
            const angle = func.args[0];
            const circ = func.args[1] || 360;
            computedColor = computedColor.rotate((angle / circ) * 360);
        }
        if (func.name === "twheel") {
            // This function depends on the definition of \rangetHsb, which we
            // don't actually know, so we just use it's default, which is to
            // add a 60 deg. angle to everything. I think...
            const angle = func.args[0];
            const circ = func.args[1] || 360;
            computedColor = computedColor.rotate((angle / circ) * 360 + 60);
        }
    }

    return computedColor;
}

/**
 * Convert the xcolor defined color to RGB Hex representation.
 * If the color is unknown or cannot be computed, `null` is returned.
 *
 * If `model` is supplied,
 *
 * The most likely reason a color will be `null` is if the color is defined
 * using a pre-defined color that wasn't supplied as an argument.
 */
export function xcolorColorToHex(
    color: string,
    model?: string | null,
    options: {
        predefinedColors?: Record<string, Color<any>>;
    } = { predefinedColors: {} }
): string | null {
    const { predefinedColors = {} } = options;
    const parsed = xcolorParser(color);
    // If a model was entered, the corresponding color was directly entered without
    // mixing, unless the parsed type was "color". This would through an error in `xcolor`,
    // but we won't error.
    if (model && model !== "default" && parsed.type !== "color") {
        if (!(model in XColorModelToColor)) {
            throw new Error(
                `Unknown color model "${model}"; known models are ${Object.keys(
                    XColorModelToColor
                ).join(", ")}`
            );
        }
        if (parsed.type !== "hex_spec" && parsed.type !== "num_spec") {
            throw new Error(
                `Cannot use model ${model} to compute the color "${color}"`
            );
        }

        if (model === "HTML" && parsed.type === "hex_spec") {
            return XColorModelToColor.HTML(parsed.content).hex();
        } else if (parsed.type === "num_spec") {
            type x = keyof Omit<typeof XColorModelToColor, "HTML">;
            return XColorModelToColor[
                model as keyof Omit<typeof XColorModelToColor, "HTML">
            ](parsed.content).hex();
        }

        throw new Error(
            `Don't know how to process color "${color}" in model "${model}"`
        );
    }

    if (Array.isArray(parsed) || parsed.type !== "color") {
        throw new Error(
            `Cannot the color "${color}" is not a valid color string`
        );
    }
    let computed: Color<any> | null = null;
    try {
        computed = computeColor(parsed, predefinedColors);
    } catch (e) {}

    return computed && computed.hex();
}
