// features/document/components/unsaved-confirm-dialog.tsx — 未保存确认对话框
// 窗口关闭时若有未保存更改，弹出三选一确认：保存 / 不保存 / 取消

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

type UnsavedConfirmDialogProps = {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

/**
 * 未保存确认对话框 — 窗口关闭前的数据保护。
 *
 * 三个操作：
 * - 保存：写回原文件后关闭
 * - 不保存：放弃更改直接关闭
 * - 取消：返回编辑器
 *
 * 禁用 Escape 和遮罩点击关闭，避免误操作丢失数据。
 */
export function UnsavedConfirmDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedConfirmDialogProps) {
  const { t } = useT();

  return (
    <Dialog
      onOpenChange={(o) => {
        // 阻止外部关闭（Escape / 遮罩点击），只能通过按钮操作
        if (!o) {
          return;
        }
      }}
      open={open}
    >
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t("dialog.unsavedTitle")}</DialogTitle>
          <DialogDescription>{t("dialog.unsavedMessage")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button onClick={onCancel} type="button" variant="ghost">
            {t("dialog.cancel")}
          </Button>
          <Button onClick={onDiscard} type="button" variant="outline">
            {t("dialog.discardChanges")}
          </Button>
          <Button onClick={onSave} type="button">
            {t("document.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
