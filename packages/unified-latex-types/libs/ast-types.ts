export type GenericAst = GenericNode | GenericNode[];

export interface GenericNode {
    [x: string]: any;
    type: string;
    _renderInfo?: object;
}

// Abstract nodes
interface BaseNode {
    type: string;
    _renderInfo?: any;
    position?: {
        start: { offset: number; line: number; column: number };
        end: { offset: number; line: number; column: number };
    };
}

interface ContentNode extends BaseNode {
    content: Node[];
}

// Actual nodes
export interface Root extends ContentNode {
    type: "root";
}
export interface String extends BaseNode {
    type: "string";
    content: string;
}

export interface Whitespace extends BaseNode {
    type: "whitespace";
}

export interface Parbreak extends BaseNode {
    type: "parbreak";
}

export interface Comment extends BaseNode {
    type: "comment";
    content: string;
    sameline?: boolean;
    suffixParbreak?: boolean;
    leadingWhitespace?: boolean;
}

export interface Macro extends BaseNode {
    type: "macro";
    content: string;
    escapeToken?: string;
    args?: Argument[];
}

export interface Environment extends ContentNode {
    type: "environment" | "mathenv";
    env: string;
    args?: Argument[];
}

export interface VerbatimEnvironment extends BaseNode {
    type: "verbatim";
    env: string;
    content: string;
}

export interface DisplayMath extends ContentNode {
    type: "displaymath";
}

export interface Group extends ContentNode {
    type: "group";
}

export interface InlineMath extends ContentNode {
    type: "inlinemath";
}

export interface Verb extends BaseNode {
    type: "verb";
    env: string;
    escape: string;
    content: string;
}

export interface Argument extends ContentNode {
    type: "argument";
    openMark: string;
    closeMark: string;
}

export type Node =
    | Root
    | String
    | Whitespace
    | Parbreak
    | Comment
    | Macro
    | Environment
    | VerbatimEnvironment
    | InlineMath
    | DisplayMath
    | Group
    | Verb;

export type Ast = Node | Argument | Node[];
