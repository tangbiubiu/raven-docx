// MenuBar — 菜单栏 (Application Menu Bar)
// 7 个菜单项，仅文案展示，Phase 1 占位壳
// 完整下拉菜单交互在 Phase 4 实现
// Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §2

import { useT } from "@/lib/i18n";

/** 菜单项定义 */
const MENU_ITEMS = [
  "menu.file",
  "menu.edit",
  "menu.view",
  "menu.insert",
  "menu.format",
  "menu.agent",
  "menu.help",
] as const;

export function MenuBar() {
  const { t } = useT();

  return (
    <nav
      aria-label={t("menu.file")}
      className="flex h-8 shrink-0 items-center gap-1 border-border border-b bg-background px-4"
      role="menubar"
    >
      {MENU_ITEMS.map((key) => (
        <button
          className="cursor-default rounded px-2 py-0.5 text-muted-foreground text-xs hover:bg-accent hover:text-accent-foreground"
          key={key}
          role="menuitem"
          tabIndex={0}
          type="button"
        >
          {t(key)}
        </button>
      ))}
    </nav>
  );
}
