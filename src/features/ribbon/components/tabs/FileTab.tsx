// src/features/ribbon/components/tabs/FileTab.tsx — 文件标签页 / File tab
// 顶部按 MS Word 布局(D3): 独立菜单栏移除后,文件操作收进 Ribbon 最左侧「文件」tab。
// 点击标签展开下拉式文件菜单,点击外部/Escape/执行动作后回到默认 tab(home)。
// 说明: 另存为 = 保存别名(现状继承自原 menu-bar 的 file:saveAs → onSave,不实现真另存为)。

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import type { RibbonCallbacks } from "../Ribbon";

type FileAction = {
  labelKey: string;
  shortcut?: string;
  action: () => void;
};

export function FileTab({ onNew, onOpen, onSave }: RibbonCallbacks) {
  const { t } = useT();
  const setActiveTab = useAppStore((s) => s.setActiveRibbonTab);
  const rootRef = useRef<HTMLDivElement>(null);

  // Word 风格: 点击文件菜单外部关闭(回到默认 tab)
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) {
        return;
      }
      setActiveTab("home");
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTab("home");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [setActiveTab]);

  // 执行动作后关闭文件菜单(与 Word Backstage 关闭行为一致)
  const run = (action: () => void) => {
    action();
    setActiveTab("home");
  };

  const items: FileAction[] = [
    { labelKey: "menu.file.new", shortcut: "⌘N", action: onNew },
    { labelKey: "menu.file.open", shortcut: "⌘O", action: onOpen },
    { labelKey: "menu.file.save", shortcut: "⌘S", action: onSave },
    // 另存为 = 保存别名(现状),不实现真另存为
    { labelKey: "menu.file.saveAs", shortcut: "⌘⇧S", action: onSave },
  ];

  return (
    <div
      className="flex min-w-[220px] flex-col items-stretch gap-0.5 py-1"
      data-testid="file-tab"
      ref={rootRef}
    >
      {items.map((item) => (
        <button
          className="flex items-center justify-between gap-8 rounded px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          data-testid={`file-item-${item.labelKey}`}
          key={item.labelKey}
          onClick={() => run(item.action)}
          type="button"
        >
          <span>{t(item.labelKey)}</span>
          {item.shortcut ? (
            <span className="text-muted-foreground text-xs">
              {item.shortcut}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
