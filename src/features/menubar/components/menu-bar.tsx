// menubar/components/MenuBar.tsx — 菜单栏 (Menu Bar)
// 水平菜单栏，点击展开下拉，点击外部/Escape 关闭。
// Reference: .dev/proto/workspace.html (menu bar section)

import { useEffect, useRef, useState } from "react";
import {
  execInsertImage,
  execInsertLink,
  execInsertTable,
  execRedo,
  execToggleMark,
  execUndo,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MenuEntry } from "../menu-config";
import { MENU_GROUPS } from "../menu-config";

export type MenuBarCallbacks = {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleOutline: () => void;
  onToggleAgentSidebar: () => void;
  onPageSetup: () => void;
  onHeaderFooter: () => void;
};

/** 下拉菜单渲染子组件，从 MenuBar 中抽取以降低认知复杂度 */
function MenuDropdown({
  group,
  onAction,
}: {
  group: (typeof MENU_GROUPS)[number];
  onAction: (entry: MenuEntry) => void;
}) {
  const { t } = useT();
  return (
    <div
      className="absolute top-full left-0 z-50 min-w-[200px] rounded-md border border-border bg-background p-1 shadow-lg"
      data-testid={`menu-dropdown-${group.id}`}
    >
      {group.items.map((item, idx) => {
        if (item.separator) {
          // biome-ignore lint/suspicious/noArrayIndexKey: separators have no unique id
          return <div className="my-1 h-px bg-border" key={`sep-${idx}`} />;
        }
        return (
          <button
            className={cn(
              "flex w-full items-center justify-between rounded px-3 py-1.5 text-sm transition-colors",
              item.disabled
                ? "cursor-not-allowed text-muted-foreground/50"
                : "hover:bg-accent hover:text-accent-foreground",
              item.highlight === true && !item.disabled
                ? "font-medium text-primary"
                : ""
            )}
            data-testid={item.action ? `menu-item-${item.action}` : ""}
            disabled={item.disabled}
            key={item.action ?? `item-${String(idx)}`}
            onClick={() => onAction(item)}
            type="button"
          >
            <span>{item.labelKey ? t(item.labelKey) : ""}</span>
            {item.shortcut ? (
              <span className="ml-8 text-muted-foreground text-xs">
                {item.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 菜单栏组件。
 * 从 menu-config 读取结构，action 通过 callback 或 commands.ts 执行。
 */
export function MenuBar({
  onNew,
  onOpen,
  onSave,
  onZoomIn,
  onZoomOut,
  onToggleOutline,
  onToggleAgentSidebar,
  onPageSetup,
  onHeaderFooter,
}: MenuBarCallbacks) {
  const { t } = useT();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!openMenuId) {
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuBarRef.current &&
        !menuBarRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  // Escape 关闭
  useEffect(() => {
    if (!openMenuId) {
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openMenuId]);
  const handleAction = (entry: MenuEntry) => {
    setOpenMenuId(null);
    if (entry.disabled || !entry.action) {
      return;
    }

    switch (entry.action) {
      case "file:new":
        onNew();
        break;
      case "file:open":
        onOpen();
        break;
      case "file:save":
      case "file:saveAs":
        onSave();
        break;
      case "edit:undo":
        execUndo();
        break;
      case "edit:redo":
        execRedo();
        break;
      case "view:toggleOutline":
        onToggleOutline();
        break;
      case "view:zoomIn":
        onZoomIn();
        break;
      case "view:zoomOut":
        onZoomOut();
        break;
      case "insert:table":
        execInsertTable();
        break;
      case "insert:image":
        execInsertImage();
        break;
      case "insert:link":
        execInsertLink();
        break;
      case "format:bold":
        execToggleMark("bold");
        break;
      case "format:italic":
        execToggleMark("italic");
        break;
      case "format:underline":
        execToggleMark("underline");
        break;
      case "format:strikethrough":
        execToggleMark("strike");
        break;
      case "pageLayout:pageSetup":
        onPageSetup();
        break;
      case "pageLayout:headerFooter":
        onHeaderFooter();
        break;
      case "agent:panel":
        onToggleAgentSidebar();
        break;
      default:
    }
  };

  return (
    <div
      className="flex shrink-0 items-center border-border border-b bg-background px-2"
      data-testid="menu-bar"
      ref={menuBarRef}
    >
      {MENU_GROUPS.map((group) => (
        <div className="relative" key={group.id}>
          <button
            aria-expanded={openMenuId === group.id}
            aria-haspopup="true"
            className={cn(
              "rounded px-3 py-1.5 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              openMenuId === group.id ? "bg-accent text-accent-foreground" : ""
            )}
            data-testid={`menu-${group.id}`}
            onClick={() =>
              setOpenMenuId(openMenuId === group.id ? null : group.id)
            }
            type="button"
          >
            {t(group.labelKey)}
          </button>

          {openMenuId === group.id ? (
            <MenuDropdown group={group} onAction={handleAction} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
