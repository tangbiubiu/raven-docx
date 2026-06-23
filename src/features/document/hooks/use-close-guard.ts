// features/document/hooks/use-close-guard.ts — 窗口关闭拦截 hook
// 窗口关闭时若有未保存更改，阻止关闭并弹确认对话框；
// 放行关闭时清理 agent 临时文件。

import { useEffect, useState } from "react";
import { commands } from "@/lib/bindings";
import { onCloseRequested } from "@/lib/tauri-events";
import { useAgentStore } from "@/stores/useAgentStore";
import { useDocumentStore } from "@/stores/useDocumentStore";

type UseCloseGuardOptions = {
  saveDocument: () => Promise<boolean>;
};

type UseCloseGuardReturn = {
  confirmOpen: boolean;
  handleSave: () => Promise<void>;
  handleDiscard: () => void;
  handleCancel: () => void;
};

/**
 * useCloseGuard — 拦截窗口关闭请求，保护未保存的数据。
 *
 * 流程：
 * 1. 窗口关闭请求触发 → 检查 isDirty
 * 2. isDirty=false → 放行关闭 + 清理 agent 临时文件
 * 3. isDirty=true → preventDefault() 阻止关闭，打开确认对话框
 * 4. 用户选择：保存（写回后关闭流程重新放行）/ 放弃（标记 non-dirty）/ 取消（保持 dirty）
 *
 * 注意：保存和放弃不会自动关闭窗口——用户需再次触发关闭。
 * 这避免在异步保存过程中窗口被销毁的竞态。
 */
export function useCloseGuard({
  saveDocument,
}: UseCloseGuardOptions): UseCloseGuardReturn {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onCloseRequested(async (event) => {
      const { isDirty } = useDocumentStore.getState();
      if (isDirty) {
        // 有未保存更改 → 阻止关闭，弹对话框
        // 临时文件不删除：用户可能取消，agent 仍需使用
        event.preventDefault();
        setConfirmOpen(true);
      } else {
        // 放行关闭 → 清理 agent 临时文件
        const { tempDocPath } = useAgentStore.getState();
        if (tempDocPath) {
          await commands.deleteTempFile(tempDocPath);
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const handleSave = async (): Promise<void> => {
    const ok = await saveDocument();
    if (ok) {
      useDocumentStore.getState().setDirty(false);
    }
    setConfirmOpen(false);
  };

  const handleDiscard = (): void => {
    useDocumentStore.getState().setDirty(false);
    setConfirmOpen(false);
  };

  const handleCancel = (): void => {
    setConfirmOpen(false);
  };

  return {
    confirmOpen,
    handleSave,
    handleDiscard,
    handleCancel,
  };
}
