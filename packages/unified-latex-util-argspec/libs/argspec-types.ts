export type Ast = Node[] | Node;
export type Node = Optional | Mandatory | Verbatim | Body | Until;
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
    defaultArg?: string;
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
export interface Embellishment extends DefaultArgument, AstNode {
    type: "embellishment";
    embellishmentTokens: string[];
    embellishmentDefaultArg?: string[];
}
interface Mandatory extends LeadingWhitespace, DefaultArgument, Arg {
    type: "mandatory";
}
interface Body extends AstNode {
    type: "body";
}
interface Until extends AstNode {
    type: "until";
    stopTokens: string[];
}
