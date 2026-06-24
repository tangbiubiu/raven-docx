# 字体处理问题根源与修复规划 / Font Handling Root Cause & Fix Plan

> 日期 / Date: 2026-06-23
> 状态 / Status: 待实施 / Pending
> 关联 / Related: `feat/ribbon-layout` 分支 Phase 2 (HomeTab 字体 Select)

## 一、问题现象 / Symptoms

控制台三类输出:

| # | 级别 | 信息 | 来源 |
|---|------|------|------|
| 1 | Warning | `Module "stream" has been externalized for browser compatibility` | `sax` 包 (Node.js XML 解析器) 被 `@eigenpal/docx-editor-core` 间接依赖 |
| 2 | Error ×N | `Failed to load resource: 400 (css2)` | Google Fonts API 返回 400 |
| 3 | Warning ×2 | `Select is changing from uncontrolled to controlled` | HomeTab 字体/字号 Select ✅ 已修复 (commit `c918007`) |

本文档聚焦问题 #2 —— Google Fonts 400 错误的完整链路与修复方案。

## 二、根源链路 / Root Cause Chain

### 2.1 数据流全景

```
用户选择字体
  → FONT_FAMILIES 查表 (font 字段是 CSS fallback 列表)
  → applyFont() 把整个 CSS 列表传入
  → execSetFontFamily("system-ui, sans-serif")
  → docx-editor-core setFontFamily() 原样存入 ProseMirror mark {ascii, hAnsi}
  → 两个出口:
      ① toDOM 渲染 → CSS font-family (浏览器能解析,编辑器显示"正常")
      ② OOXML 序列化 → <w:rFonts w:ascii="system-ui, sans-serif"/> (非法 OOXML)
  → 字体加载器:按 ascii 值构建 Google Fonts URL
      → https://fonts.googleapis.com/css2?family=system-ui%2C%20sans-serif
      → Google Fonts 不认此名 → 400
```

### 2.2 逐步证据

**Step 1 — UI 数据源用 CSS 列表当字体名**

```ts
// src/features/formatting/constants.ts:47-52
export const FONT_FAMILIES = [
  { value: "default", label: "系统默认", font: "" },
  { value: "sans",    label: "无衬线",   font: "system-ui, sans-serif" },  // ← CSS fallback 列表
  { value: "serif",   label: "衬线体",   font: "Georgia, serif" },
  { value: "mono",    label: "等宽体",   font: "Menlo, monospace" },
];
```

**Step 2 — applyFont 把整个字符串传入命令**

```ts
// src/features/formatting/format-apply.ts:22-27
export function applyFont(fontValue: string): void {
  const family = FONT_FAMILIES.find((f) => f.value === fontValue);
  if (family?.font) {
    execSetFontFamily(family.font);  // 传入 "system-ui, sans-serif"
  }
}
```

> 代码中已有 `TODO(语义债)` 注释 (L17-20) 标注此问题。

**Step 3 — docx-editor-core 原样存入 mark 属性**

```js
// @eigenpal/docx-editor-core dist/chunk-SWBLJF6R.mjs (反混淆)
setFontFamily: (name) => createMark(schema.marks.fontFamily, {
  ascii: name,   // "system-ui, sans-serif" ← 整个 CSS 列表,非法
  hAnsi: name,
})
```

`ascii` / `hAnsi` 语义上应为**单一字体名**(对应 OOXML `<w:rFonts w:ascii="Calibri"/>`)。

**Step 4 — 字体加载器用原始字符串请求 Google Fonts**

```js
// @eigenpal/docx-editor-core dist/chunk-7LRR7RKE.mjs (反混淆)

// 收集文档中的字体名
let { ascii, hAnsi } = formatting.fontFamily;
ascii && set.add(ascii);  // "system-ui, sans-serif" 加入待加载集合

// 构建 Google Fonts URL
function buildFontUrl(name, weights, styles) {
  let encoded = encodeURIComponent(name);  // "system-ui%2C%20sans-serif"
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@...&display=swap`;
}

// → https://fonts.googleapis.com/css2?family=system-ui%2C%20sans-serif:ital,wght@0,400;0,700&display=swap
// → 400 Bad Request
```

### 2.3 为什么编辑器里看起来"正常"

`toDOM` 方法输出 CSS,浏览器能解析 fallback 列表:

```js
// chunk-SWBLJF6R.mjs toDOM (反混淆)
toDOM(node) {
  let e = node.attrs.ascii || node.attrs.hAnsi;  // "system-ui, sans-serif"
  return e
    ? ["span", { style: `font-family: ${e.includes(" ") ? `"${e}"` : e}, sans-serif` }, 0]
    // → font-family: "system-ui, sans-serif", sans-serif  ← 浏览器能渲染
    : ["span", 0];
}
```

渲染靠巧合工作,但 OOXML 数据已经脏了。

### 2.4 docx-editor-core 的正确路径(字体表)

库内置了已知字体映射表(`chunk-AMENZY5F.mjs`),当 `ascii` 是**单一字体名**时:

| OOXML 字体名 | Google Fonts 等价 | CSS fallback stack |
|---|---|---|
| `calibri` | Carlito | Calibri, Carlito, Arial, Helvetica, sans-serif |
| `arial` | Arimo | Arial, Arimo, Helvetica, sans-serif |
| `times new roman` | Tinos | Times New Roman, Tinos, Times, serif |
| `courier new` | Cousine | Courier New, Cousine, Courier, monospace |
| `georgia` | Tinos | Georgia, Tinos, Times, serif |
| `cambria` | Caladea | Cambria, Caladea, Georgia, serif |

解析器流程:
1. 查表命中 → 用 `googleFont` 等价名请求 Google Fonts(如 "Carlito" 而非 "Calibri")→ 200 OK
2. 输出正确的 `cssFallback` 列表给浏览器渲染
3. 序列化出合法的 OOXML

未知字体走另一分支:不请求 Google Fonts(`googleFont: null`),按分类词匹配回退到 serif/sans-serif/monospace。

## 三、影响范围 / Impact

| 维度 | 预期 | 当前实际 |
|---|---|---|
| OOXML `w:ascii` | 单一字体名 `Calibri` | CSS 列表 `system-ui, sans-serif` (非法) |
| Google Fonts 请求 | `family=Carlito` (等价名) → 200 | `family=system-ui%2C%20sans-serif` → 400 |
| CSS 渲染 | `font-family: Calibri, Carlito, Arial, sans-serif` | `font-family: "system-ui, sans-serif", sans-serif` |
| 文档保存(.docx) | 合法 OOXML,Word 可正确打开 | `w:ascii` 含非法值,Word 可能回退默认字体 |
| 跨平台一致性 | Calibri/Arial 等有度量数据,排版精确 | system-ui 在不同 OS 渲染不同字体,排版不一致 |

**受影响文件:**
- `src/features/formatting/constants.ts` — `FONT_FAMILIES` 定义
- `src/features/formatting/format-apply.ts` — `applyFont` (TODO 已标注)
- `src/features/ribbon/components/tabs/HomeTab.tsx` — Select 数据源
- `src/features/ribbon/components/RibbonFormatButtons.tsx` — `useFontFamilyValue` 回显逻辑
- `src/features/ribbon/components/__tests__/FormatPainter.test.tsx` — mock `fontFamily` 值需随 `FONT_FAMILIES` 更新

## 四、修复规划 / Fix Plan

### 4.1 方案:单一字体名 + 库字体表驱动

将 `FONT_FAMILIES` 的 `font` 字段从 CSS fallback 列表改为**单一字体名**,优先选 docx-editor-core 字体表中有 Google 等价的字体(避免 400)。

### 4.2 字体清单

```ts
// 修复后的 FONT_FAMILIES
export const FONT_FAMILIES = [
  { value: "default", label: "系统默认",        font: "" },
  { value: "calibri", label: "Calibri",         font: "Calibri" },
  { value: "arial",   label: "Arial",           font: "Arial" },
  { value: "times",   label: "Times New Roman", font: "Times New Roman" },
  { value: "georgia", label: "Georgia",         font: "Georgia" },
  { value: "courier", label: "Courier New",     font: "Courier New" },
  { value: "cambria", label: "Cambria",         font: "Cambria" },
];
```

选型依据:
- `Calibri` — Word 默认正文字体,库表命中 → Google Carlito
- `Arial` — 通用无衬线,库表命中 → Google Arimo
- `Times New Roman` — 标准衬线,库表命中 → Google Tinos
- `Georgia` — 屏幕友好衬线,库表命中 → Google Tinos
- `Courier New` — 标准等宽,库表命中 → Google Cousine
- `Cambria` — Word 默认标题字体,库表命中 → Google Caladea

### 4.3 实施步骤

| 步骤 | 文件 | 改动 |
|---|---|---|
| 1 | `src/features/formatting/constants.ts` | 替换 `FONT_FAMILIES` 的 `font` 字段为单一字体名 |
| 2 | `src/features/formatting/format-apply.ts` | 删除 `TODO(语义债)` 注释(问题已解决);`applyFont` 主体逻辑不变(已传 `family.font`)。**注意:`value="default"`(`font: ""`)当前直接 return 不调用 `execSetFontFamily`,语义是"不设置"而非"清除已应用字体"。若"系统默认"需具备清除能力,需在此补充移除 fontFamily mark 的逻辑;本次按占位项处理,清除能力留作后续** |
| 3 | `src/features/ribbon/components/RibbonFormatButtons.tsx` | **新增**(非"检查")回显映射实现,详见 §4.4 |
| 4 | `src/features/ribbon/components/__tests__/tabs/HomeTab.test.tsx` | 更新测试中的 mock 字体值(注意:实际路径在 `__tests__/tabs/` 下,非文档早期版本的 `tabs/` 直接子文件) |
| 5 | `src/features/ribbon/components/__tests__/FormatPainter.test.tsx` | mock 的 `fontFamily: "Georgia, serif"` 应更新为单一字体名(如 `"Georgia"`),与修复后 `FONT_FAMILIES` 一致。FormatPainter 经 `snapshotMarks`→`applyMarks` 透传 ascii 值,不经 `FONT_FAMILIES`,故无逻辑改动,仅 mock 值需同步 |
| 6 | i18n (`zh-CN.ts` / `en.ts`) | 字体 label 可直接用字体名(不需翻译),或保留中文 label |

### 4.4 回显逻辑适配(关键)

**问题**:HomeTab 字体 Select 是受控组件,`value={fontFamilyValue ?? ""}`,而 `fontFamilyValue` 来自 `selectionFormat.fontFamily`(`useEditorBridge.ts:60` 确认其值 = mark 的 `ascii` 原始值,如 `"Calibri"`)。但 `SelectItem` 的 `value` 是语义 key(如 `"calibri"`)。二者不匹配时 Select 显示 placeholder。

- **修复前**能工作纯属巧合:`fontFamilyValue` = `"system-ui, sans-serif"` 不在 SelectItem value 集合内,Select 显示 placeholder,恰好"看起来对"。
- **修复后**会暴露问题:`fontFamilyValue` = `"Calibri"`,SelectItem value = `"calibri"`,大小写 + 语义 key 都对不上,Select 仍显示 placeholder 而非 "Calibri"。

**实现**:在 `useFontFamilyValue`(或 Select 的 `value` 计算处)新增反向映射,把 ascii 原始值映射回 `FONT_FAMILIES.value`:

```ts
// src/features/ribbon/components/RibbonFormatButtons.tsx
import { FONT_FAMILIES } from "@/features/formatting/constants";

/** 受控字体 Select 的当前值 hook(细粒度订阅 + ascii→value 反向映射) */
export function useFontFamilyValue(): string {
  const ascii = useDocumentStore((s) => s.selectionFormat?.fontFamily ?? "");
  if (!ascii) return "default";
  // 大小写不敏感匹配 FONT_FAMILIES.font,命中则回显语义 key
  return (
    FONT_FAMILIES.find(
      (f) => f.font?.toLowerCase() === ascii.toLowerCase()
    )?.value ?? ""
  );
}
```

**边界处理**:
- `ascii` 为空 → 回显 `"default"`(占位项)
- 选区字体不在 `FONT_FAMILIES` 中(如从 .docx 打开含其他字体的文档)→ 返回 `""`,Select 显示 placeholder
- 大小写归一化:`FONT_MAPPING` 加载表大小写敏感(`Calibri` 命中、`calibri` 不命中),但回显匹配此处做了 `toLowerCase`,避免 Word 保存的大小写差异导致回显失败

### 4.5 验证清单

- [ ] `bun run typecheck` 通过
- [ ] `bun run test -- --run` 全部通过(含 HomeTab 测试)
- [ ] `bun tauri dev` 启动后:
  - [ ] 控制台无 Google Fonts 400 错误(选择库表内字体时)
  - [ ] 控制台无 Select 受控/非受控警告
  - [ ] Select 切换字体后编辑器正确渲染
  - [ ] 选区变化时 Select 正确回显当前字体
- [ ] 保存 .docx 后用 Word 打开,`w:ascii` 值为单一字体名
- [ ] 回显映射单元测试:ascii `"Calibri"` → Select value `"calibri"`;ascii `"Arial"` → `"arial"`;未知字体 → `""`(placeholder);ascii 空 → `"default"`

### 4.6 不在本次范围

- `stream` 模块外部化警告 — 第三方库 `sax` 的 Node.js 依赖,Vite 自动外部化,无运行时影响,不需修复
- 中文字体(宋体/微软雅黑等)— Google Fonts 不提供,即使字体名正确也会 400。需上游 `docx-editor-core` 支持配置字体回退或禁用 Google Fonts 加载,属独立 issue
