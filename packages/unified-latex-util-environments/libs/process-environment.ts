import * as Ast from "@unified-latex/unified-latex-types";
import { EnvInfo, EnvInfoRecord } from "@unified-latex/unified-latex-types";
import { updateRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { gobbleArguments } from "@unified-latex/unified-latex-util-arguments";
import { match } from "@unified-latex/unified-latex-util-match";
import { visit } from "@unified-latex/unified-latex-util-visit";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";

/**
 * Performs any needed processing on the environment (as specified by `envInfo`)
 * including attaching arguments and possibly manipulating the environment's body.
 */
export function processEnvironment(envNode: Ast.Environment, envInfo: EnvInfo) {
    attachEnvironmentArgs(envNode, envInfo);

    updateRenderInfo(envNode, envInfo.renderInfo);
    if (typeof envInfo.processContent === "function") {
        envNode.content = envInfo.processContent(envNode.content);
    }
}

/**
 * Attach the arguments specified by `envInfo.signature` to the environment, removing
 * them from its body. Nothing is done if the arguments have already been attached.
 */
export function attachEnvironmentArgs(
    envNode: Ast.Environment,
    envInfo: EnvInfo
) {
    if (envInfo.signature && envNode.args == null) {
        const { args } = gobbleArguments(envNode.content, envInfo.signature);
        envNode.args = args;
    }
}

/**
 * Recursively search for and process the specified environments. Arguments are
 * consumed according to the `signature` specified. The body is processed
 * with the specified `processContent` function (if given). Any specified `renderInfo`
 * is attached to the environment node.
 */
export function processEnvironments(
    tree: Ast.Ast,
    environments: EnvInfoRecord
) {
    const isRelevantEnvironment = match.createEnvironmentMatcher(environments);

    visit(
        tree,
        {
            leave: (node) => {
                const envName = printRaw(node.env);
                const envInfo = environments[envName];
                if (!envInfo) {
                    throw new Error(
                        `Could not find environment info for environment "${envName}"`
                    );
                }
                processEnvironment(node, envInfo);
            },
        },
        { test: isRelevantEnvironment }
    );
}
