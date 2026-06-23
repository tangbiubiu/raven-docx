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

/** 清理临时文件并强制销毁窗口（destroy 不触发 close-requested，避免递归）。 */
async function cleanupAndDestroy(): Promise<void> {
  // 清理临时文件——失败不阻断窗口关闭
  try {
    const { tempDocPath } = useAgentStore.getState();
    if (tempDocPath) {
      await commands.deleteTempFile(tempDocPath);
    }
  } catch {
    // 临时文件清理失败不阻断关闭
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().destroy();
}

/**
 * useCloseGuard — 拦截窗口关闭请求，保护未保存的数据。
 *
 * 流程：
 * 1. 窗口关闭请求触发 → 检查 isDirty
 * 2. isDirty=false → 放行关闭 + 清理 agent 临时文件
 * 3. isDirty=true → preventDefault() 阻止关闭，打开确认对话框
 * 4. 保存成功 / 放弃 → cleanupAndDestroy()（清理临时文件 + destroy 窗口）
 * 5. 取消 → 保持 dirty，用户继续编辑
 *
 * 注意：用 destroy() 而非 close() 关闭窗口。
 * close() 会重新触发 close-requested → onCloseRequested 递归；
 * destroy() 强制关闭，不触发事件。
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
    try {
      const ok = await saveDocument();
      if (!ok) {
        return;
      }
      useDocumentStore.getState().setDirty(false);
      setConfirmOpen(false);
    } catch {
      // 保存失败 → 保持对话框打开，用户可重试或取消
      return;
    }
    // 保存成功 → 清理临时文件 + 销毁窗口（即使清理失败也要关闭）
    await cleanupAndDestroy();
  };

  const handleDiscard = (): void => {
    useDocumentStore.getState().setDirty(false);
    setConfirmOpen(false);
    // 放弃更改 → 清理临时文件 + 销毁窗口
    cleanupAndDestroy();
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
