// features/table/components/InsertImageButton.tsx — 插入图片按钮 (Insert Image Button)
// 隐藏的文件输入框触发系统选择器
// Reference: .dev/proto/workspace.html §btn-image

import { type ChangeEvent, useRef } from "react";
import { useT } from "@/lib/i18n";
import { useTableOperations } from "../hooks/useTableOperations";

/**
 * 插入图片按钮组件。
 * 点击按钮触发隐藏的文件输入框，选择图片后插入文档。
 */
export function InsertImageButton() {
  const { t } = useT();
  const { insertImage } = useTableOperations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 处理文件选择 */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Tauri 环境使用 file.path，Web 环境使用 file.name
    const path = (file as File & { path?: string }).path ?? file.name;
    insertImage(path);

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        aria-label={t("menu.insert.image")}
        className="inline-flex h-7 items-center rounded px-2 text-xs hover:bg-muted"
        data-testid="insert-image-btn"
        onClick={() => fileInputRef.current?.click()}
        title={t("menu.insert.image")}
        type="button"
      >
        🖼
      </button>
      <input
        accept="image/*"
        className="hidden"
        data-testid="image-file-input"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
    </>
  );
}
