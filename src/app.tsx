// App — 应用根组件 (Application Root Component)
// 单页面应用，WorkspacePage 为唯一路由
// Reference: .dev/docs/module-split.md §2

import { useEffect } from "react";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAppStore } from "@/stores/useAppStore";
import { logger } from "@/lib/logger";

function App() {
  const isInitialLoading = useAppStore((s) => s.isInitialLoading);
  const loadFromStorage = useSettingsStore((s) => s.loadFromStorage);

  // 应用初始化：加载设置
  useEffect(() => {
    loadFromStorage().catch((err) => {
      logger.error(`Failed to load settings: ${String(err)}`);
      // 即使加载失败也显示界面
      useAppStore.getState().setInitialLoading(false);
    });
  }, [loadFromStorage]);

  // 首次加载中
  if (isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-3 h-2 w-32 animate-pulse rounded-full bg-muted" />
          <p className="text-muted-foreground text-sm">geex-docx</p>
        </div>
      </div>
    );
  }

  return <WorkspacePage />;
}

export default App;