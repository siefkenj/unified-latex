import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { listPackages } from ".";
import * as Ast from "../unified-latex-types";
import { processLatexToAstViaUnified } from "../unified-latex-util-parse";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-packages", () => {
    let value: string | undefined;
    let file: VFile | undefined;
    let ast: Ast.Ast | undefined
    it("can list \\usepackage packages", ()=> {
        value = "\\usepackage[baz]{foo}\\usepackage{bar-nun}"
        file = processLatexToAstViaUnified().processSync({value})
        ast = file.result as Ast.Ast
          
        let packages = listPackages(ast).map(node => node.content)
        expect(packages).toEqual(["foo", "bar-nun"])
    })
    it("can list \\RequirePackage packages", ()=> {
        value = "\\RequirePackage{foo}\\RequirePackage{bar}"
        file = processLatexToAstViaUnified().processSync({value})
        ast = file.result as Ast.Ast
          
        let packages = listPackages(ast).map(node => node.content)
        expect(packages).toEqual(["foo", "bar"])
    })
    it("can list packages separated by commas", ()=> {
        value = "\\usepackage{foo, bar%\n,baz}"
        file = processLatexToAstViaUnified().processSync({value})
        ast = file.result as Ast.Ast
          
        let packages = listPackages(ast).map(node => node.content)
        expect(packages).toEqual(["foo", "bar", "baz"])
    })
})