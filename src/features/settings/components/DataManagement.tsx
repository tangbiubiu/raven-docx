// biome-ignore-all lint/suspicious/noAlert: confirm is appropriate UX for destructive data actions

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useSettings } from "../hooks/useSettings";

/**
 * 数据管理区域。
 * 包含清除对话历史、清除草稿、重置所有设置。
 */
export function DataManagement() {
  const { t } = useT();
  const { clearChatHistory, clearDrafts, resetAllSettings } = useSettings();
  const [clearingSessions, setClearingSessions] = useState(false);
  const [clearingDrafts, setClearingDrafts] = useState(false);

  const handleClearSessions = useCallback(async () => {
    if (!window.confirm(t("settings.data.clearSessionsConfirm"))) {
      return;
    }
    setClearingSessions(true);
    try {
      await clearChatHistory();
    } finally {
      setClearingSessions(false);
    }
  }, [clearChatHistory, t]);
  const handleClearDrafts = useCallback(async () => {
    if (!window.confirm(t("settings.data.clearDraftsConfirm"))) {
      return;
    }
    setClearingDrafts(true);
    try {
      await clearDrafts();
    } finally {
      setClearingDrafts(false);
    }
  }, [clearDrafts, t]);
  const handleResetAll = useCallback(async () => {
    if (!window.confirm(t("settings.data.resetWarning"))) {
      return;
    }
    await resetAllSettings();
  }, [resetAllSettings, t]);

  return (
    <section className="mb-6">
      <h3 className="mb-4 font-semibold text-base">
        {t("settings.data.title")}
      </h3>

      <div className="space-y-2">
        <Button
          className="w-full justify-center"
          disabled={clearingSessions}
          onClick={handleClearSessions}
          type="button"
          variant="outline"
        >
          {clearingSessions
            ? t("settings.data.clearing")
            : t("settings.data.clearSessions")}
        </Button>

        <Button
          className="w-full justify-center"
          disabled={clearingDrafts}
          onClick={handleClearDrafts}
          type="button"
          variant="outline"
        >
          {clearingDrafts
            ? t("settings.data.clearing")
            : t("settings.data.clearDrafts")}
        </Button>

        <Button
          className="w-full justify-center"
          onClick={handleResetAll}
          type="button"
          variant="destructive"
        >
          {t("settings.data.reset")}
        </Button>
      </div>
    </section>
  );
}
