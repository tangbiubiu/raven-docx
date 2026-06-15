// Toolbar — 格式工具栏 (Formatting Toolbar)
// 完整实现：撤销/重做 + 文字格式 + 字体/字号/颜色/高亮 + 标题/对齐/列表/缩进 + 插入/清除
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/proto/workspace.html

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import {
  execIndent,
  execInsertImage,
  execInsertLink,
  execInsertTable,
  execLift,
  execOutdent,
  execRedo,
  execSetBlockType,
  execToggleMark,
  execUndo,
  execWrapIn,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useFormatState } from "../hooks/use-format-state";

// === 常量 ===

const TEXT_MARKS: {
  key: string;
  i18n: string;
  markName: string;
}[] = [
  { key: "bold", i18n: "format.bold", markName: "bold" },
  { key: "italic", i18n: "format.italic", markName: "italic" },
  { key: "underline", i18n: "format.underline", markName: "underline" },
  { key: "strikethrough", i18n: "format.strikethrough", markName: "strike" },
];

const SUPER_SUB_MARKS: {
  key: string;
  i18n: string;
  markName: string;
}[] = [
  { key: "superscript", i18n: "format.superscript", markName: "superscript" },
  { key: "subscript", i18n: "format.subscript", markName: "subscript" },
];

const HEADING_OPTIONS = [
  { value: "paragraph", i18n: "format.normal" },
  { value: "heading1", i18n: "format.heading1" },
  { value: "heading2", i18n: "format.heading2" },
  { value: "heading3", i18n: "format.heading3" },
  { value: "heading4", i18n: "format.heading4" },
  { value: "heading5", i18n: "format.heading5" },
  { value: "heading6", i18n: "format.heading6" },
];

const ALIGNMENTS: {
  key: string;
  i18n: string;
  alignment: string;
}[] = [
  { key: "alignLeft", i18n: "format.alignLeft", alignment: "left" },
  { key: "alignCenter", i18n: "format.alignCenter", alignment: "center" },
  { key: "alignRight", i18n: "format.alignRight", alignment: "right" },
  { key: "alignJustify", i18n: "format.alignJustify", alignment: "justify" },
];

/** 字体列表 */
const FONT_FAMILIES = [
  { value: "default", label: "系统默认", font: "" },
  { value: "sans", label: "无衬线", font: "system-ui, sans-serif" },
  { value: "serif", label: "衬线体", font: "Georgia, serif" },
  { value: "mono", label: "等宽体", font: "Menlo, monospace" },
];

/** 字号列表（半磅） */
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

// === 辅助函数 ===

/** 通过 bridge.applyFormatting 设置字体 */
function applyFont(fontValue: string): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const family = FONT_FAMILIES.find((f) => f.value === fontValue);
  if (!family) {
    return;
  }

  // 通过 ProseMirror mark 设置字体
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const fontFamilyMark = state.schema.marks.fontFamily;
  if (fontFamilyMark && family.font) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    dispatch(
      state.tr.addMark(from, to, fontFamilyMark.create({ ascii: family.font }))
    );
  }
}

/** 通过 ProseMirror mark 设置字号 */
function applyFontSize(sizeHalfPt: number): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const fontSizeMark = state.schema.marks.fontSize;
  if (fontSizeMark) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    dispatch(
      state.tr.addMark(from, to, fontSizeMark.create({ size: sizeHalfPt }))
    );
  }
}

/** 通过 ProseMirror mark 设置文字颜色 */
function applyTextColor(color: string): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const colorMark = state.schema.marks.color;
  if (colorMark) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    // OOXML color uses rgb without #
    const rgb = color.replace("#", "");
    dispatch(state.tr.addMark(from, to, colorMark.create({ rgb })));
  }
}

/** 通过 ProseMirror mark 设置高亮 */
function applyHighlight(color: string): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const highlightMark = state.schema.marks.highlight;
  if (highlightMark) {
    const { from, to, empty } = state.selection;
    if (empty) {
      return;
    }
    dispatch(state.tr.addMark(from, to, highlightMark.create({ color })));
  }
}

/** 清除选区格式 */
function clearFormatting(): void {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return;
  }
  const view = bridge.getEditorView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const { from, to, empty } = state.selection;
  if (empty) {
    return;
  }
  // 移除所有 marks
  dispatch(state.tr.removeMark(from, to));
}

// === 分隔符组件 ===

function Separator() {
  return <span className="mx-0.5 h-5 w-px bg-border" />;
}

// === 主组件 ===

export function Toolbar() {
  const { t } = useT();
  const formatState = useFormatState();

  const headingValue = () => {
    const level = formatState.getHeadingLevel();
    return level ? `heading${level}` : "paragraph";
  };

  const listType = formatState.getListType();

  return (
    <div
      aria-label={t("menu.format")}
      className="flex h-10 shrink-0 flex-wrap items-center gap-0.5 border-border border-b bg-background px-2"
      role="toolbar"
    >
      {/* 撤销/重做 */}
      <button
        aria-label={t("menu.edit.undo")}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-xs hover:bg-muted"
        data-testid="toolbar-undo"
        onClick={() => execUndo()}
        title={t("menu.edit.undo")}
        type="button"
      >
        ↩
      </button>
      <button
        aria-label={t("menu.edit.redo")}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-xs hover:bg-muted"
        data-testid="toolbar-redo"
        onClick={() => execRedo()}
        title={t("menu.edit.redo")}
        type="button"
      >
        ↪
      </button>

      <Separator />

      {/* 文字格式 */}
      {TEXT_MARKS.map((mark) => (
        <Toggle
          aria-label={t(mark.i18n)}
          data-testid={`toolbar-${mark.key}`}
          key={mark.key}
          onPressedChange={() => execToggleMark(mark.markName)}
          pressed={formatState.isActive(mark.markName)}
          size="sm"
        >
          <span className="text-xs">{t(mark.i18n)}</span>
        </Toggle>
      ))}

      <Separator />

      {/* 上标/下标 */}
      {SUPER_SUB_MARKS.map((mark) => (
        <Toggle
          aria-label={t(mark.i18n)}
          data-testid={`toolbar-${mark.key}`}
          key={mark.key}
          onPressedChange={() => execToggleMark(mark.markName)}
          pressed={formatState.isActive(mark.markName)}
          size="sm"
        >
          <span className="text-xs">{t(mark.i18n)}</span>
        </Toggle>
      ))}

      <Separator />

      {/* 标题下拉 */}
      <Select
        onValueChange={(v) => {
          if (v === "paragraph") {
            execSetBlockType("paragraph");
          } else {
            const level = Number.parseInt(v.replace("heading", ""), 10);
            execSetBlockType("heading", { level });
          }
        }}
        value={headingValue()}
      >
        <SelectTrigger className="h-7 w-[80px] text-xs" size="sm">
          <SelectValue placeholder={t("format.normal")} />
        </SelectTrigger>
        <SelectContent>
          {HEADING_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.i18n)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 字体 */}
      <Select onValueChange={applyFont}>
        <SelectTrigger className="h-7 w-[80px] text-xs" size="sm">
          <SelectValue placeholder={t("format.font")} />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 字号 */}
      <Select onValueChange={(v) => applyFontSize(Number.parseInt(v, 10) * 2)}>
        <SelectTrigger className="h-7 w-[60px] text-xs" size="sm">
          <SelectValue placeholder={t("format.fontSize")} />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator />

      {/* 对齐按钮组 */}
      {ALIGNMENTS.map((align) => (
        <Toggle
          aria-label={t(align.i18n)}
          data-testid={`toolbar-${align.key}`}
          key={align.key}
          onPressedChange={() => {
            execSetBlockType("paragraph", { alignment: align.alignment });
          }}
          pressed={formatState.isAlignActive(align.alignment)}
          size="sm"
        />
      ))}

      <Separator />

      {/* 列表按钮 */}
      <Toggle
        aria-label={t("format.orderedList")}
        data-testid="toolbar-orderedList"
        onPressedChange={() =>
          listType === "ordered" ? execLift() : execWrapIn("ordered_list")
        }
        pressed={listType === "ordered"}
        size="sm"
      >
        <span className="text-xs">{t("format.orderedList")}</span>
      </Toggle>

      <Toggle
        aria-label={t("format.unorderedList")}
        data-testid="toolbar-unorderedList"
        onPressedChange={() =>
          listType === "unordered" ? execLift() : execWrapIn("bullet_list")
        }
        pressed={listType === "unordered"}
        size="sm"
      >
        <span className="text-xs">{t("format.unorderedList")}</span>
      </Toggle>

      {/* 缩进 */}
      <button
        aria-label={t("format.indent")}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-xs hover:bg-muted"
        data-testid="toolbar-indent"
        onClick={() => execIndent()}
        title={t("format.indent")}
        type="button"
      >
        →
      </button>
      <button
        aria-label={t("format.outdent")}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-xs hover:bg-muted"
        data-testid="toolbar-outdent"
        onClick={() => execOutdent()}
        title={t("format.outdent")}
        type="button"
      >
        ←
      </button>

      <Separator />

      {/* 文字颜色 */}
      <input
        aria-label={t("format.textColor")}
        className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
        data-testid="toolbar-textColor"
        onChange={(e) => applyTextColor(e.target.value)}
        title={t("format.textColor")}
        type="color"
      />

      {/* 高亮 */}
      <input
        aria-label={t("format.highlight")}
        className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
        data-testid="toolbar-highlight"
        onChange={(e) => applyHighlight(e.target.value)}
        title={t("format.highlight")}
        type="color"
        value="#ffff00"
      />

      <Separator />

      {/* 插入：表格/图片/链接 */}
      <button
        aria-label={t("menu.insert.table")}
        className="inline-flex h-7 items-center rounded px-2 text-xs hover:bg-muted"
        data-testid="toolbar-insertTable"
        onClick={() => execInsertTable()}
        title={t("menu.insert.table")}
        type="button"
      >
        ⊞
      </button>
      <button
        aria-label={t("menu.insert.image")}
        className="inline-flex h-7 items-center rounded px-2 text-xs hover:bg-muted"
        data-testid="toolbar-insertImage"
        onClick={() => execInsertImage()}
        title={t("menu.insert.image")}
        type="button"
      >
        🖼
      </button>
      <button
        aria-label={t("menu.insert.link")}
        className="inline-flex h-7 items-center rounded px-2 text-xs hover:bg-muted"
        data-testid="toolbar-insertLink"
        onClick={() => execInsertLink()}
        title={t("menu.insert.link")}
        type="button"
      >
        🔗
      </button>

      <Separator />

      {/* 清除格式 */}
      <button
        aria-label={t("format.clearFormat")}
        className="inline-flex h-7 items-center rounded px-2 text-xs hover:bg-muted"
        data-testid="toolbar-clearFormat"
        onClick={() => clearFormatting()}
        type="button"
      >
        {t("format.clearFormat")}
      </button>
    </div>
  );
}
