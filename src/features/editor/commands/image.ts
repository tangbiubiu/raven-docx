// editor/commands/image.ts — 图片 (Phase 4):插入图片、环绕类型。

import { setImageWrapType } from "@eigenpal/docx-editor-core/prosemirror/commands";
import { open } from "@tauri-apps/plugin-dialog";
import { apply, getView } from "./shared";

/** OOXML 环绕类型(含方向便利值)/ Image wrap target */
export type ImageWrapTarget =
  | "inline"
  | "square"
  | "tight"
  | "through"
  | "topAndBottom"
  | "behind"
  | "inFront"
  | "squareLeft"
  | "squareRight";

/** 插入图片（触发文件选择器） */
export async function execInsertImage(): Promise<void> {
  const view = getView();
  if (!view) {
    return;
  }

  try {
    // Tauri plugin: only available in desktop runtime, not in web/test env
    const selected = await open({
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
        },
      ],
      multiple: false,
    });
    if (!selected || typeof selected !== "string") {
      return;
    }
    view.dispatch(view.state.tr.insertText(`![图片](${selected})`));
  } catch {
    view.dispatch(view.state.tr.insertText("[插入图片]"));
  }
}

/** 设置图片环绕类型 / Set image wrap type for the image at the current selection */
export function execSetImageWrapType(target: ImageWrapTarget): void {
  const view = getView();
  if (!view) {
    return;
  }
  const { $from } = view.state.selection;
  // 向上遍历祖先节点,找到 image 节点的文档位置
  let pos: number | null = null;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node && node.type.name === "image") {
      pos = $from.before(d);
      break;
    }
  }
  if (pos === null) {
    return;
  }
  apply(setImageWrapType(pos, target));
}
