export type Ast = Node[] | Node;
export type Node = Optional | Mandatory | Verbatim | Body | Group | string;
type Optional = OptionalArg | OptionalStar | OptionalToken | Embellishment;
interface AstNode {
    type: string;
}
interface Arg extends AstNode {
    openBrace: string;
    closeBrace: string;
}
export interface LeadingWhitespace {
    noLeadingWhitespace: boolean | undefined;
}
export interface DefaultArgument {
    defaultArg: Group;
}
interface Verbatim extends Arg {
    type: "verbatim";
}
interface OptionalArg extends LeadingWhitespace, DefaultArgument, Arg {
    type: "optional";
}
interface OptionalStar extends LeadingWhitespace, AstNode {
    type: "optionalStar";
}
interface OptionalToken extends LeadingWhitespace, AstNode {
    type: "optionalToken";
    token: string;
}
interface Embellishment extends DefaultArgument, AstNode {
    type: "embellishment";
    embellishmentTokens: string[];
}
interface Mandatory extends LeadingWhitespace, DefaultArgument, Arg {
    type: "mandatory";
}
interface Group extends AstNode {
    type: "group";
    content: (Group | string)[];
}
interface Body extends AstNode {
    type: "body";
}
