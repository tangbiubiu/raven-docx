// Toolbar — 格式工具栏 (Formatting Toolbar)
// Phase 2: 完整实现格式按钮，通过 ProseMirror toggleMark/setBlockType 操作
// Reference: .dev/plan/implementation-plan.md §Phase 2, .dev/docs/module-split.md §3.3

import { lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";
import { useFormatState } from "../hooks/use-format-state";

// === 常量 ===

/** 格式 toggle 按钮配置 */
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

/** 标题级别 */
const HEADING_OPTIONS = [
  { value: "paragraph", i18n: "format.normal", level: undefined },
  { value: "heading1", i18n: "format.heading1", level: 1 },
  { value: "heading2", i18n: "format.heading2", level: 2 },
  { value: "heading3", i18n: "format.heading3", level: 3 },
  { value: "heading4", i18n: "format.heading4", level: 4 },
  { value: "heading5", i18n: "format.heading5", level: 5 },
  { value: "heading6", i18n: "format.heading6", level: 6 },
];

/** 对齐选项 */
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

// === 工具函数 ===

/** 获取 ProseMirror EditorView，不存在则返回 null */
function getView() {
  const bridge = useDocumentStore.getState().editorBridge;
  if (!bridge) {
    return null;
  }
  return bridge.getEditorView();
}

/** 执行 toggleMark 命令 */
function execToggleMark(markName: string) {
  const view = getView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const mark = state.schema.marks[markName];
  if (!mark) {
    return;
  }
  toggleMark(mark)(state, dispatch);
}

/** 执行 setBlockType 命令 */
function execSetBlockType(nodeName: string, attrs?: Record<string, unknown>) {
  const view = getView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const node = state.schema.nodes[nodeName];
  if (!node) {
    return;
  }
  if (nodeName === "paragraph") {
    // setBlockType with no attrs for paragraph
    setBlockType(node)(state, dispatch);
  } else {
    setBlockType(node, attrs ?? null)(state, dispatch);
  }
}

/** 执行 wrapIn list 命令 */
function execWrapIn(nodeName: string) {
  const view = getView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  const node = state.schema.nodes[nodeName];
  if (!node) {
    return;
  }
  wrapIn(node)(state, dispatch);
}

/** 执行 lift 命令（取消列表/缩进） */
function execLift() {
  const view = getView();
  if (!view) {
    return;
  }
  const { state, dispatch } = view;
  lift(state, dispatch);
}

// === 组件 ===

/**
 * Toolbar — 格式工具栏。
 *
 * 通过 `editorBridge.getEditorView()` 获取 ProseMirror EditorView，
 * 使用 toggleMark/setBlockType 命令实现格式操作。
 * 按钮 active 状态直接从 ProseMirror EditorView 读取（通过 useFormatState）。
 */
export function Toolbar() {
  const { t } = useT();
  const formatState = useFormatState();

  /** 字体下拉选择 */
  const handleFontChange = (_value: string) => {
    // Phase 2: 字体切换暂不实现（需要字体列表）
  };

  /** 字号下拉选择 */
  const handleFontSizeChange = (_value: string) => {
    // Phase 2: 字号切换暂不实现
  };

  /** 当前标题级别对应的 value */
  const headingValue = () => {
    const level = formatState.getHeadingLevel();
    if (!level) {
      return "paragraph";
    }
    return `heading${level}`;
  };

  const listType = formatState.getListType();

  return (
    <div
      aria-label={t("menu.format")}
      className="flex h-10 shrink-0 items-center gap-0.5 border-border border-b bg-background px-2"
      role="toolbar"
    >
      {/* 文字格式：粗/斜/下划线/删除线 */}
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

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

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

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

      {/* 字体 */}
      <Select onValueChange={handleFontChange}>
        <SelectTrigger className="h-7 w-[90px] text-xs" size="sm">
          <SelectValue placeholder={t("format.font")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t("format.font")}</SelectItem>
        </SelectContent>
      </Select>

      {/* 字号 */}
      <Select onValueChange={handleFontSizeChange}>
        <SelectTrigger className="h-7 w-[60px] text-xs" size="sm">
          <SelectValue placeholder={t("format.fontSize")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t("format.fontSize")}</SelectItem>
        </SelectContent>
      </Select>

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

      {/* 文字颜色 */}
      <input
        aria-label={t("format.textColor")}
        className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
        onChange={(_e) => {
          /* Phase 2: 文字颜色暂不实现 */
        }}
        type="color"
      />

      {/* 高亮 */}
      <input
        aria-label={t("format.highlight")}
        className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
        onChange={(_e) => {
          /* Phase 2: 高亮暂不实现 */
        }}
        type="color"
        value="#ffff00"
      />

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

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

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

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

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

      {/* 列表按钮 */}
      <Toggle
        aria-label={t("format.orderedList")}
        data-testid="toolbar-orderedList"
        onPressedChange={() => execWrapIn("ordered_list")}
        pressed={listType === "ordered"}
        size="sm"
      >
        <span className="text-xs">{t("format.orderedList")}</span>
      </Toggle>

      <Toggle
        aria-label={t("format.unorderedList")}
        data-testid="toolbar-unorderedList"
        onPressedChange={() => execWrapIn("bullet_list")}
        pressed={listType === "unordered"}
        size="sm"
      >
        <span className="text-xs">{t("format.unorderedList")}</span>
      </Toggle>

      {/* 缩进按钮 */}
      <button
        aria-label={t("format.indent")}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-xs hover:bg-muted"
        data-testid="toolbar-indent"
        onClick={() => {
          // Phase 2: indent 暂不实现
        }}
        type="button"
      >
        →
      </button>

      <button
        aria-label={t("format.outdent")}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-xs hover:bg-muted"
        data-testid="toolbar-outdent"
        onClick={() => {
          // Phase 2: outdent 暂不实现
        }}
        type="button"
      >
        ←
      </button>

      {/* 分隔 */}
      <span className="mx-0.5 h-5 w-px bg-border" />

      {/* 清除格式 */}
      <button
        aria-label={t("format.clearFormat")}
        className="inline-flex h-7 items-center rounded px-2 text-xs hover:bg-muted"
        data-testid="toolbar-clearFormat"
        onClick={() => execLift()}
        type="button"
      >
        {t("format.clearFormat")}
      </button>
    </div>
  );
}
