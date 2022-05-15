import {
    FunctionDeclaration,
    FunctionExpression,
    Node,
    SourceFile,
    ts,
    TypeAliasDeclaration,
    VariableDeclaration,
} from "ts-morph";
import Prettier from "prettier";

export { ts };

export function getDataOnAllExports(sourceFile: SourceFile) {
    const accumulatedExports = getExports(sourceFile);

    return {
        constants: accumulatedExports.constants.map((declaration) => {
            const statement = declaration.getVariableStatementOrThrow();
            const doc = statement.getJsDocs()[0];
            let desc = "";
            if (doc) {
                desc += doc.getCommentText();
            }
            const name = declaration.getName();
            const type = declaration
                .getType()
                .getApparentType()
                .getText(
                    declaration,
                    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
                );
            return { name, type, desc };
        }),
        types: accumulatedExports.types.map((declaration) => {
            const name = declaration.getName();
            // The type could be defined in all sorts of complicated ways, so we just
            // include the raw code.
            const doc = declaration.getText();
            return { name, doc };
        }),
        funcs: accumulatedExports.funcs.map(getFuncInfo),
        plugins: accumulatedExports.plugins.map(getPluginInfo),
    };
}

function getExports(sourceFile: SourceFile) {
    const symbols = sourceFile.getExportSymbols();
    const accumulatedExports: {
        funcs: (FunctionDeclaration | FunctionExpression)[];
        types: TypeAliasDeclaration[];
        constants: VariableDeclaration[];
        plugins: FunctionExpression[];
    } = { funcs: [], types: [], constants: [], plugins: [] };

    for (const sym of symbols) {
        const declaration = sym.getDeclarations()[0];
        if (Node.isFunctionDeclaration(declaration)) {
            accumulatedExports.funcs.push(declaration);
        }
        if (Node.isVariableDeclaration(declaration)) {
            // We need to check to see if the constant is actually a function
            // that was declared as `const xxx = (...) => ...`
            const initializer = declaration.getInitializer();
            if (Node.isFunctionExpression(initializer)) {
                // We want to manipulate this type so it matches as closely
                // as possible to if it were declared as a function originally.
                initializer.rename(declaration.getName());
                const jsDocs = declaration
                    .getVariableStatement()
                    .getJsDocs()[0];
                if (jsDocs) {
                    initializer.addJsDoc(jsDocs.getStructure());
                }
                // The function may be a Plugin. We hardcode a special case for plugins.
                const contextualType = initializer.getContextualType();
                const contextualTypeName = contextualType.getText(
                    initializer,
                    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
                );
                if (contextualTypeName.startsWith("Plugin")) {
                    accumulatedExports.plugins.push(initializer);
                } else {
                    accumulatedExports.funcs.push(initializer);
                }
            } else {
                accumulatedExports.constants.push(declaration);
            }
        }
        if (Node.isTypeAliasDeclaration(declaration)) {
            accumulatedExports.types.push(declaration);
        }
    }

    // Sort alphabetically
    accumulatedExports.constants.sort((a, b) => {
        return a.getName().localeCompare(b.getName());
    });
    accumulatedExports.types.sort((a, b) => {
        return a.getName().localeCompare(b.getName());
    });
    accumulatedExports.funcs.sort((a, b) => {
        return a.getName().localeCompare(b.getName());
    });
    accumulatedExports.plugins.sort((a, b) => {
        return a.getName().localeCompare(b.getName());
    });

    return accumulatedExports;
}

function getFuncInfo(declaration: FunctionDeclaration | FunctionExpression) {
    const name = declaration.getName();
    const returnType = declaration
        .getReturnType()
        .getText(
            declaration,
            ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
        );
    let description = "";
    const doc = declaration.getJsDocs()[0];
    const paramInfo: Record<string, string> = {};
    if (doc) {
        description = doc.getDescription().trim();
        for (const tag of doc.getTags()) {
            paramInfo[tag.getSymbol()?.getName()] = tag.getCommentText();
        }
    }

    const params = declaration.getParameters().map((p) => {
        const name = p.getName();
        let desc = paramInfo[name] || "";
        const type = p
            .getType()
            .getApparentType()
            .getText(p, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
        let longType = "";
        // If not description was given, we should see if there is one in the object
        const symbol = p.getType().getApparentType().getSymbol();
        if (symbol) {
            longType = symbol.getDeclarations()[0]?.getText();
            let lt = `type ${type} = ${longType}`;
            try {
                longType = Prettier.format(lt, {
                    parser: "typescript",
                }).trim();
            } catch {
                // If we cannot pretty-print the type, it is probably something funny, so just ignore it.
                longType = "";
            }
        }

        return {
            name,
            type,
            desc,
            longType,
        };
    });

    if (Node.isFunctionExpression(declaration)) {
        description +=
            "`" + declaration.getContextualType().getText(declaration) + "`";
    }

    const typeParameters = declaration
        .getTypeParameters()
        .map((p) => p.getText())
        .join(", ");

    return { name, returnType, description, params, typeParameters };
}

function getPluginInfo(declaration: FunctionExpression) {
    const name = declaration.getName();
    const returnType = declaration
        .getReturnType()
        .getText(
            declaration,
            ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
        );
    let description = "";
    const doc = declaration.getJsDocs()[0];
    const paramInfo: Record<string, string> = {};
    if (doc) {
        description = doc.getDescription().trim();
        for (const tag of doc.getTags()) {
            paramInfo[tag.getSymbol()?.getName()] = tag.getCommentText();
        }
    }

    const params = declaration.getParameters().map((p) => {
        const name = p.getName();
        let desc = paramInfo[name] || "";
        const type = p
            .getType()
            .getApparentType()
            .getText(p, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
        let longType = "";
        // If not description was given, we should see if there is one in the object
        const symbol = p.getType().getApparentType().getSymbol();
        if (symbol) {
            longType = symbol.getDeclarations()[0]?.getText();
            let lt = `type ${type} = ${longType}`;
            try {
                longType = Prettier.format(lt, {
                    parser: "typescript",
                }).trim();
            } catch {
                // If we cannot pretty-print the type, it is probably something funny, so just ignore it.
                longType = "";
            }
        }

        return {
            name,
            type,
            desc,
            longType,
        };
    });

    const contextualType = declaration.getContextualType();
    const pluginType = contextualType.getText(
        declaration,
        ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
    );

    // We compute the type of the plugin's options.
    // It is always the first type param
    let optionsType = "void";
    const firstArg = contextualType.getAliasTypeArguments()[0];
    if (firstArg && firstArg.isArray()) {
        optionsType = firstArg
            .getArrayElementType()
            .getText(
                declaration,
                ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
            );
    }

    const typeParameters = declaration
        .getTypeParameters()
        .map((p) => p.getText())
        .join(", ");

    return {
        name,
        returnType,
        description,
        params,
        typeParameters,
        pluginType,
        optionsType,
    };
}
