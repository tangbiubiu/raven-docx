# infrastructure — 共享基础设施

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **范围**：`lib/` + `hooks/` + `components/ui/` + `i18n/`
> **状态**：草案

---

## 1. 模块清单

```
lib/
├── bindings.ts       # tauri-specta 自动生成（已有）
├── logger.ts         # 日志工具（已有）
├── utils.ts          # 通用工具（已有）
├── cn.ts             # clsx + tailwind-merge
└── tauri-events.ts   # Tauri 事件监听封装

hooks/
├── useTauriCommand.ts   # Tauri command 调用封装
└── useKeyboard.ts       # 全局快捷键管理

components/ui/        # shadcn/ui 组件（已有 button, input 等）

i18n/
├── index.ts           # i18n 初始化
├── zh-CN.ts           # 简体中文（默认）
└── en.ts              # 英文
```

---

## 2. lib/cn.ts — classname 工具

```typescript
// lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

所有 shadcn/ui 组件的标准依赖。已有 `clsx` 和 `tailwind-merge` 在 `package.json` 中。

---

## 3. lib/tauri-events.ts — Tauri 事件封装

```typescript
// lib/tauri-events.ts
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// pi agent 事件类型
type PiEventType = "text_delta" | "tool_call" | "tool_result" | "agent_end" | "error";

interface PiEventPayloads {
  text_delta: { text: string };
  tool_call: { name: string; args: object };
  tool_result: { name: string; result: object };
  agent_end: {};
  error: { message: string };
}

// 监听 pi 事件
export function onPiEvent<T extends PiEventType>(
  type: T,
  callback: (payload: PiEventPayloads[T]) => void
): Promise<UnlistenFn> {
  return listen<PiEventPayloads[T]>(`pi:${type}`, (event) => {
    callback(event.payload);
  });
}

// Tauri close 事件
export function onCloseRequested(callback: () => Promise<void>): Promise<UnlistenFn> {
  return listen("tauri://close-requested", async () => {
    await callback();
  });
}
```

---

## 4. hooks/useTauriCommand.ts — 统一 command 调用

```typescript
// hooks/useTauriCommand.ts
import { logger } from "@/lib/logger";

// 对 tauri-specta Result<T,E> 的一次性调用封装
export async function callTauriCommand<T>(
  commandName: string,
  fn: () => Promise<{ status: "ok"; data: T } | { status: "error"; error: string }>,
): Promise<T> {
  logger.debug(`Calling Tauri command: ${commandName}`);

  const result = await fn();

  if (result.status === "error") {
    logger.error(`Tauri command '${commandName}' failed: ${result.error}`);
    throw new Error(result.error);
  }

  return result.data;
}

// 对于不需要返回值的命令
export async function callTauriCommandVoid(
  commandName: string,
  fn: () => Promise<{ status: "ok"; data: null } | { status: "error"; error: string }>,
): Promise<void> {
  await callTauriCommand<null>(commandName, fn);
}
```

---

## 5. hooks/useKeyboard.ts — 全局快捷键

```typescript
// hooks/useKeyboard.ts
import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;            // "k" | "j" | "f" | "s"
  metaKey?: boolean;      // Cmd on Mac, Ctrl on Win
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  disabled?: boolean;
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (s.disabled) continue;
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const metaMatch = s.metaKey ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatch = s.ctrlKey ? e.ctrlKey : true;
        const shiftMatch = s.shiftKey ? e.shiftKey : !e.shiftKey;

        if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
```

WorkspacePage 中的使用：
```typescript
useKeyboard([
  { key: "k",  metaKey: true, handler: () => openModal("commandPalette") },
  { key: "f",  metaKey: true, handler: () => openModal("findReplace") },
  { key: "s",  metaKey: true, handler: () => saveDocument() },
  { key: "escape",              handler: () => closeModal() },
]);
```

---

## 6. i18n/ — 多语言

```typescript
// i18n/index.ts
import { createI18n } from "..."; // 或简单实现

const messages = {
  "zh-CN": { /* 所有中文 key */ },
  "en":    { /* 所有英文 key */ },
};

// 默认简体中文
export const i18n = createI18n({
  defaultLocale: "zh-CN",
  messages,
});

// React hook
export function useT() {
  const locale = useSettingsStore(s => s.editorConfig.locale ?? "zh-CN");
  return (key: string, params?: Record<string, string | number>) => {
    let template = messages[locale]?.[key] ?? messages["zh-CN"][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replace(`{${k}}`, String(v));
      }
    }
    return template;
  };
}
```

多语言 Key 分散在各 feature 文档的末尾（`## N. 多语言` 章节）。

---

## 7. components/ui/ — shadcn/ui

已有组件：`button.tsx`, `input.tsx`。

后续可按需添加：
- `dialog.tsx` — 模态对话框（PageSetupDialog, FindReplaceDialog …）
- `select.tsx` — 下拉选择（FontPicker, FontSizePicker …）
- `toggle.tsx` — 开关（暗色模式, 自动保存 …）
- `tabs.tsx` — 标签切换（AgentSidebar 对话/批注）
- `tooltip.tsx` — 提示（工具栏按钮 hover）
- `popover.tsx` — 浮层（SuggestionPopover, InsertTableGrid …）
- `dropdown-menu.tsx` — 下拉菜单（MenuBar）
