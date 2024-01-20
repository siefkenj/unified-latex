export type Ast = Node[] | Node;
export type Node = Optional | Mandatory | Verbatim | Body | Until;
type Optional = OptionalArg | OptionalStar | OptionalToken | Embellishment;

// Make several optional properties available in all `AstNode`s
interface AstNode
    extends Partial<Arg>,
        Partial<LeadingWhitespace>,
        DefaultArgument {
    type: string;
}

// Mixins
interface Arg {
    openBrace: string;
    closeBrace: string;
}
interface LeadingWhitespace {
    noLeadingWhitespace: boolean | undefined;
}
interface DefaultArgument {
    defaultArg?: string;
}

// Make `openBrace` and `closeBrace` required by extending both.
// Typescript requires specifying those properties to be specified in interface body,
// otherwise the compilation will error out.
interface Verbatim extends AstNode, Arg {
    type: "verbatim";
    openBrace: string;
    closeBrace: string;
}
interface OptionalArg extends LeadingWhitespace, DefaultArgument, AstNode, Arg {
    type: "optional";
    openBrace: string;
    closeBrace: string;
    noLeadingWhitespace: boolean | undefined;
    defaultArg?: string;
}
interface OptionalStar extends LeadingWhitespace, AstNode {
    type: "optionalStar";
    noLeadingWhitespace: boolean | undefined;
}
interface OptionalToken extends LeadingWhitespace, AstNode {
    type: "optionalToken";
    token: string;
    noLeadingWhitespace: boolean | undefined;
}
export interface Embellishment extends AstNode {
    type: "embellishment";
    embellishmentTokens: string[];
    embellishmentDefaultArg?: string[]; // Embellishment default arguments are always a collection of arguments
}
interface Mandatory extends DefaultArgument, AstNode, Arg {
    type: "mandatory";
    openBrace: string;
    closeBrace: string;
}
interface Body extends AstNode {
    type: "body";
}
interface Until extends AstNode {
    type: "until";
    stopTokens: string[];
}
