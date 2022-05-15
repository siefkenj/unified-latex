import Prettier from "prettier";

const forExport = (async () => {
    const remarkGfm = await (await import("remark-gfm")).default;
    const remarkParse = await (await import("remark-parse")).default;
    const remarkStringify = await (await import("remark-stringify")).default;
    const b = await (await import("mdast-builder")).default;
    const { unified } = await import("unified");

    type MdNode = ReturnType<typeof b.text>;

    /**
     * A github-flavored-markdown version of `Remark`.
     */
    const gfmRemark = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkStringify);

    function createRow(items: (string | MdNode)[]) {
        return b.tableRow(
            items.map((i) => {
                const content = typeof i === "string" ? b.text(i) : i;
                return b.tableCell(content);
            })
        );
    }

    function makeConstantsTable(omitDescription: boolean) {
        const inner = [
            createRow(
                omitDescription
                    ? ["Name", "Type"]
                    : ["Name", "Type", "Description"]
            ),
        ];
        const table = b.root(b.table(["left", "left", "left"], inner));

        return { table, inner };
    }
    function addRowToConstantsTable(
        table: ReturnType<typeof makeConstantsTable>,
        { name, type, desc }: { name: string; type: string; desc: string },
        omitDescription: boolean
    ) {
        table.inner.push(
            createRow(
                omitDescription
                    ? [b.inlineCode(name), b.inlineCode(type)]
                    : [
                          b.inlineCode(name),
                          b.inlineCode(type),
                          gfmRemark.parse(desc),
                      ]
            )
        );
    }

    /**
     * Construct the body of the section for listing exported constants
     */
    function makeConstantsSection(
        constants: { name: string; type: string; desc: string }[]
    ) {
        const omitDescription = constants.every((c) => !c.desc);
        const table = makeConstantsTable(omitDescription);
        for (const c of constants) {
            addRowToConstantsTable(table, c, omitDescription);
        }
        return table.table;
    }

    /**
     * Construct the body of the section for listing exported types.
     */
    function makeTypesSection(types: { name: string; doc: string }[]) {
        const table = b.root(
            types.flatMap(({ name, doc }) => {
                return [
                    b.heading(2, [b.inlineCode(name)]),
                    b.code("typescript", doc),
                ];
            })
        );
        return table;
    }

    /**
     * Construct the body of the section for listing exported functions.
     */
    function makeFunctionsSection(
        funcs: {
            name: string;
            returnType: string;
            typeParameters: string;
            description: string;
            params: {
                name: string;
                desc: string;
                type: string;
                longType?: string;
            }[];
        }[]
    ) {
        const table = b.root(
            funcs.flatMap(
                ({ name, returnType, description, params, typeParameters }) => {
                    const genericParam = typeParameters
                        ? `<${typeParameters}>`
                        : "";
                    let signature = `function ${name}${genericParam}(${params
                        .map(({ name, type }) => `${name}: ${type}`)
                        .join(", ")}): ${returnType}`;

                    try {
                        signature = Prettier.format(signature, {
                            parser: "typescript",
                        }).trim();
                    } catch {
                        console.warn("Failed to pretty-print", signature);
                    }

                    const paramsInfo = [];
                    if (params.length > 0) {
                        const omitDescription = params.every((p) => !p.desc);
                        paramsInfo.push(
                            b.paragraph(b.strong(b.text("Parameters"))),
                            b.table(
                                ["left", "left"],
                                [
                                    createRow(
                                        omitDescription
                                            ? ["Param", "Type"]
                                            : ["Param", "Type", "Description"]
                                    ),
                                    ...params.map(
                                        ({ name, type, desc, longType }) => {
                                            let description =
                                                gfmRemark.parse(desc);
                                            if (!desc && longType) {
                                                description = b.emphasis(
                                                    b.text("see below")
                                                ) as any;
                                            }
                                            const row = [
                                                name,
                                                type.length < 30
                                                    ? b.inlineCode(type)
                                                    : b.html(
                                                          "<span color='gray'>Omitted</span>"
                                                      ),
                                                description,
                                            ];
                                            if (omitDescription) {
                                                row.pop();
                                            }
                                            return createRow(row);
                                        }
                                    ),
                                ]
                            )
                        );
                    }

                    const extraInfo = [];
                    const longTypes = params.filter((p) => p.longType);
                    if (longTypes.length > 0) {
                        extraInfo.push(b.paragraph(b.text("where")));
                    }
                    for (const type of longTypes) {
                        extraInfo.push(b.code("typescript", type.longType));
                    }

                    return [
                        b.heading(2, [
                            b.inlineCode(
                                `${name}(${params
                                    .map(({ name }) => name)
                                    .join(", ")})`
                            ),
                        ]),
                        b.paragraph(gfmRemark.parse(description)),
                        b.code("typescript", signature),
                        ...paramsInfo,
                        ...extraInfo,
                    ];
                }
            )
        );
        return table;
    }

    /**
     * Construct the body of the section for listing exported functions.
     */
    function makePluginsSection(
        plugins: {
            name: string;
            returnType: string;
            typeParameters: string;
            description: string;
            pluginType: string;
            optionsType: string;
            params: {
                name: string;
                desc: string;
                type: string;
                longType?: string;
            }[];
        }[]
    ) {
        const table = b.root(
            plugins.flatMap(
                ({
                    name,
                    returnType,
                    description,
                    params,
                    typeParameters,
                    pluginType,
                    optionsType,
                }) => {
                    const genericParam = typeParameters
                        ? `<${typeParameters}>`
                        : "";
                    let signature = `function ${name}${genericParam}(${params
                        .map(({ name, type }) => `${name}: ${type}`)
                        .join(", ")}): ${returnType}`;

                    try {
                        signature = Prettier.format(signature, {
                            parser: "typescript",
                        }).trim();
                    } catch {}

                    const noOptions =
                        optionsType === "void" || optionsType === "undefined";
                    const usage = `unified().use(${name}${
                        noOptions ? "" : "[, options]"
                    })`;

                    const usageInfo: MdNode[] = [
                        b.heading(3, b.text("Usage")),
                        b.paragraph(b.inlineCode(usage)),
                    ];
                    if (!noOptions) {
                        usageInfo.push(
                            b.heading(4, b.text("options")),
                            b.code("typescript", optionsType)
                        );
                    }

                    const extraInfo = [];
                    const longTypes = params.filter((p) => p.longType);
                    if (longTypes.length > 0) {
                        extraInfo.push(b.paragraph(b.text("where")));
                    }
                    for (const type of longTypes) {
                        extraInfo.push(b.code("typescript", type.longType));
                    }

                    return [
                        b.heading(2, [b.inlineCode(name)]),
                        b.paragraph(gfmRemark.parse(description)),
                        ...usageInfo,
                        b.heading(3, b.text("Type")),
                        b.paragraph(b.inlineCode(pluginType)),
                        b.code("typescript", signature),
                        ...extraInfo,
                    ];
                }
            )
        );
        return table;
    }
    return {
        gfmRemark,
        makeConstantsSection,
        makeFunctionsSection,
        makeTypesSection,
        makePluginsSection,
    };
})();

export default forExport;
