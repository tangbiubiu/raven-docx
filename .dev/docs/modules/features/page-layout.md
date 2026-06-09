# features/page-layout — 页面布局

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-064（缩放）、F-100~108（页面设置）
> **状态**：草案

---

## 1. 模块结构

```
features/page-layout/
├── components/
│   ├── PageSetupDialog.tsx       # 页边距/纸张大小/方向/分栏 对话框
│   ├── HeaderFooterEditor.tsx    # 页眉页脚编辑视图
│   └── ZoomControl.tsx           # 缩放滑块（位于 StatusBar 内）
└── hooks/
    └── usePageSetup.ts          # 页面设置读写
```

---

## 2. 组件契约

### PageSetupDialog

```typescript
interface PageSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

// 分 Tab：
//   - 页边距：上/下/左/右（预设：普通/窄/适中/宽）
//   - 纸张：A4/Letter/Legal/自定义宽高
//   - 方向：纵向/横向
//   - 分栏：1/2/3栏
//   - 分节：下一页/连续/奇数页/偶数页
```

### HeaderFooterEditor

```typescript
// 编辑页眉页脚时的覆盖视图
// 激活方式：双击页眉/页脚区域 → 进入编辑模式
// 支持：首页不同、奇偶页不同
```

### ZoomControl

```typescript
// 无 props，渲染在 StatusBar 内
// 范围：50% ~ 200%
// 操作：滑块拖动 / Ctrl+滚轮 / 点击百分比输入
// 写入：useDocumentStore.setZoom()
```

---

## 3. Hook 契约 — usePageSetup

```typescript
interface PageSetup {
  margins: { top: number; bottom: number; left: number; right: number };
  pageWidth: number;
  pageHeight: number;
  orientation: "portrait" | "landscape";
  columnCount: number;
  sectionStart?: "nextPage" | "continuous" | "oddPage" | "evenPage";
}

interface UsePageSetupReturn {
  setup: PageSetup;
  applySetup(setup: Partial<PageSetup>): void;
}

function usePageSetup(): UsePageSetupReturn;
```

---

## 4. 状态依赖

| Store | 写入 | 读取 |
|-------|------|------|
| `useDocumentStore` | `setZoom()` | `zoom`, `editorBridge` |

---

## 5. Tauri 依赖

无。页面布局通过 `DocumentAgent` 操作 `SectionProperties`。

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `page.margins` | 页边距 | Margins |
| `page.paperSize` | 纸张大小 | Paper Size |
| `page.orientation` | 方向 | Orientation |
| `page.portrait` | 纵向 | Portrait |
| `page.landscape` | 横向 | Landscape |
| `page.columns` | 分栏 | Columns |
| `page.headerFooter` | 页眉页脚 | Header & Footer |
| `page.pageNumber` | 页码 | Page Number |
| `page.sectionBreak` | 分节符 | Section Break |
