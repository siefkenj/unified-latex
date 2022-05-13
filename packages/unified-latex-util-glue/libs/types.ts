type Position = { offset: number; line: number; column: number };
type Dim = { type: "dim"; value: number; unit: string };
export type Glue = {
    type: "glue";
    fixed: Dim;
    stretchable: Dim | null;
    shrinkable: Dim | null;
    position: { start: Position; end: Position };
};
