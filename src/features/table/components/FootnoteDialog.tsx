// features/table/components/FootnoteDialog.tsx — 脚注对话框 (Footnote Dialog)
// 插入脚注到当前光标位置
// Reference: .dev/plan/phase4-branch-plan.md §1.1

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useTableOperations } from "../hooks/useTableOperations";

type FootnoteDialogProps = {
  onClose: () => void;
};

/**
 * 脚注对话框组件。
 * 用户输入脚注内容后插入到当前光标位置。
 *
 * 当前实现为占位：在光标处插入脚注标记文本。
 * 完整实现需要 @eigenpal/docx-editor-agents 的脚注 API。
 */
export function FootnoteDialog({ onClose }: FootnoteDialogProps) {
  const { t } = useT();
  const { insertFootnote } = useTableOperations();

  const [text, setText] = useState("");

  /** 确认插入 */
  const handleInsert = () => {
    insertFootnote();
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
    <div className="flex flex-col gap-4 p-4" data-testid="footnote-dialog">
      <h3 className="font-semibold">
        {t("menu.insert.footnote") || "插入脚注"}
      </h3>

      <div className="flex flex-col gap-1">
        <label
          className="text-muted-foreground text-xs"
          htmlFor="footnote-text"
        >
          {t("footnote.content") || "脚注内容"}
        </label>
        <Input
          data-testid="footnote-text-input"
          id="footnote-text"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("footnote.placeholder") || "输入脚注内容…"}
          type="text"
          value={text}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          data-testid="footnote-cancel-btn"
          onClick={onClose}
          variant="outline"
        >
          {t("dialog.cancel")}
        </Button>
        <Button data-testid="footnote-insert-btn" onClick={handleInsert}>
          {t("footnote.insert") || "插入"}
        </Button>
      </div>
    </div>
  );
}
