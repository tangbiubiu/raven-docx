// menubar/menu-config.ts — Menu structure + keyboard shortcut map
// Reference: .dev/proto/workspace.html (menu bar section)

/** 单个菜单项 */
export type MenuEntry = {
  labelKey?: string; // i18n key（separator 时可选）
  shortcut?: string; // 快捷键显示文本
  action?: string; // 动作名（由调用方 dispatch）
  disabled?: boolean; // 是否禁用
  separator?: true; // 分隔线
  highlight?: boolean; // 高亮显示（用于 Agent 菜单项）
};

/** 菜单组 */
export type MenuGroup = {
  id: string;
  labelKey: string;
  items: MenuEntry[];
};

/**
 * 菜单结构定义。
 * labelKey 映射到 i18n 已有键，无需额外翻译。
 */
export const MENU_GROUPS: MenuGroup[] = [
  {
    id: "file",
    labelKey: "menu.file",
    items: [
      { labelKey: "menu.file.new", shortcut: "⌘N", action: "file:new" },
      { labelKey: "menu.file.open", shortcut: "⌘O", action: "file:open" },
      { labelKey: "menu.file.save", shortcut: "⌘S", action: "file:save" },
      { labelKey: "menu.file.saveAs", shortcut: "⌘⇧S", action: "file:saveAs" },
      { separator: true },
      { labelKey: "menu.file.close", action: "file:close" },
    ],
  },
  {
    id: "edit",
    labelKey: "menu.edit",
    items: [
      { labelKey: "menu.edit.undo", shortcut: "⌘Z", action: "edit:undo" },
      { labelKey: "menu.edit.redo", shortcut: "⌘⇧Z", action: "edit:redo" },
      { separator: true },
      { labelKey: "menu.edit.cut", shortcut: "⌘X", action: "edit:cut" },
      { labelKey: "menu.edit.copy", shortcut: "⌘C", action: "edit:copy" },
      { labelKey: "menu.edit.paste", shortcut: "⌘V", action: "edit:paste" },
      { separator: true },
      { labelKey: "menu.edit.find", shortcut: "⌘F", action: "edit:find" },
    ],
  },
  {
    id: "view",
    labelKey: "menu.view",
    items: [
      {
        labelKey: "menu.view.outline",
        action: "view:toggleOutline",
      },
      { separator: true },
      { labelKey: "menu.view.zoomIn", shortcut: "⌘+", action: "view:zoomIn" },
      { labelKey: "menu.view.zoomOut", shortcut: "⌘-", action: "view:zoomOut" },
    ],
  },
  {
    id: "insert",
    labelKey: "menu.insert",
    items: [
      { labelKey: "menu.insert.table", action: "insert:table" },
      { labelKey: "menu.insert.image", action: "insert:image" },
      { labelKey: "menu.insert.link", shortcut: "⌘K", action: "insert:link" },
    ],
  },
  {
    id: "pageLayout",
    labelKey: "pageSetup.title",
    items: [
      { labelKey: "pageSetup.title", action: "pageLayout:pageSetup" },
      { labelKey: "headerFooter.title", action: "pageLayout:headerFooter" },
    ],
  },
  {
    id: "format",
    labelKey: "menu.format",
    items: [
      { labelKey: "format.bold", shortcut: "⌘B", action: "format:bold" },
      { labelKey: "format.italic", shortcut: "⌘I", action: "format:italic" },
      {
        labelKey: "format.underline",
        shortcut: "⌘U",
        action: "format:underline",
      },
      {
        labelKey: "format.strikethrough",
        action: "format:strikethrough",
      },
      { separator: true },
      { labelKey: "format.clearFormat", action: "format:clear" },
    ],
  },
  {
    id: "agent",
    labelKey: "menu.agent",
    items: [
      {
        labelKey: "menu.agent.panel",
        action: "agent:togglePanel",
        highlight: true,
      },
    ],
  },
  {
    id: "help",
    labelKey: "menu.help",
    items: [
      {
        labelKey: "menu.help.about",
        action: "help:about",
      },
    ],
  },
];
