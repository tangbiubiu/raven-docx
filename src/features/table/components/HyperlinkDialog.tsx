// features/table/components/HyperlinkDialog.tsx — 超链接对话框 (Hyperlink Dialog)
// 插入/编辑超链接（URL + 显示文本）
// Reference: .dev/proto/workspace.html §link-modal

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useTableOperations } from "../hooks/useTableOperations";

type HyperlinkDialogProps = {
  onClose: () => void;
};

/**
 * 超链接对话框组件。
 * 用户输入 URL 和显示文本后插入超链接。
 */
export function HyperlinkDialog({ onClose }: HyperlinkDialogProps) {
  const { t } = useT();
  const { insertHyperlink } = useTableOperations();

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  /** 确认插入 */
  const handleInsert = () => {
    if (!url.trim()) {
      return;
    }
    insertHyperlink(url.trim(), text.trim());
    onClose();
  };

  /** 键盘事件：Enter 提交 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInsert();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="hyperlink-dialog">
      <h3 className="font-semibold">{t("menu.insert.link")}</h3>

      {/* 显示文本 */}
      <div className="flex flex-col gap-1">
        <label
          className="text-muted-foreground text-xs"
          htmlFor="hyperlink-text"
        >
          {t("hyperlink.text") || "显示文本"}
        </label>
        <Input
          data-testid="hyperlink-text-input"
          id="hyperlink-text"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("hyperlink.textPlaceholder") || "链接显示的文本…"}
          type="text"
          value={text}
        />
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1">
        <label
          className="text-muted-foreground text-xs"
          htmlFor="hyperlink-url"
        >
          URL
        </label>
        <Input
          data-testid="hyperlink-url-input"
          id="hyperlink-url"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://…"
          type="url"
          value={url}
        />
      </div>

      {/* 按钮组 */}
      <div className="flex justify-end gap-2">
        <Button
          data-testid="hyperlink-cancel-btn"
          onClick={onClose}
          variant="outline"
        >
          {t("dialog.cancel")}
        </Button>
        <Button
          data-testid="hyperlink-insert-btn"
          disabled={!url.trim()}
          onClick={handleInsert}
        >
          {t("hyperlink.insert") || "插入"}
        </Button>
      </div>
    </div>
  );
}
