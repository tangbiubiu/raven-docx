import type { Node as ProseMirrorNode } from "prosemirror-model";

export type { ProseMirrorNode };
export type ProsemirrorNode = ProseMirrorNode;

export type FindResult = {
  from: number;
  to: number;
};
