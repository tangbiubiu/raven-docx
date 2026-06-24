# 字体回显精确化与中文字体支持规划 / Font Echo Precision & CJK Font Support Plan

> 日期 / Date: 2026-06-23
> 状态 / Status: 待实施 / Pending
> 前置 / Prerequisite: `2026-06-23-font-handling.md`(已完成:FONT_FAMILIES 改单一字体名 + 回显反向映射)
> 关联 / Related: `feat/ribbon-layout` 分支

## 一、目标 / Goals

1. **精确回显**:选中文字后,Select 显示选区实际字体;若选区内有多种字体则回显为空(不近似、不歧义)。
2. **中文字体支持**:UI 字体清单尽可能覆盖常用中文字体,且写入 OOXML 时正确区分 `ascii` 与 `eastAsia`。

## 二、问题根源 / Root Causes

### 2.1 混合字体选区回显错误

**库的行为**(反编译 `@eigenpal/docx-editor-core` `chunk-BGY3CB37.mjs` 的 `L()` 函数):

```js
// 非空选区:只取第一个文本节点的 marks
if (!s) {
  let r = null;
  i.nodesBetween(l, g, n => r ? false : n.isText ? (r = n.marks, false) : true);
  c = r ?? m.marks();
}
```

库的 `SelectionState.textFormatting.fontFamily` 在混合字体选区下**返回第一个文本节点的字体**,不是 `null`。我们的 `buildSelectionFormat`(`useEditorBridge.ts:60`)直接读 `tf.fontFamily?.ascii`,所以混合选区会显示第一个节点的字体——**误导用户**。

**要求**:用户要求"要么百分百精确,要么不回显"。混合选区必须回显空。

### 2.2 库丢弃 eastAsia

**库的 `L()` 构建 `fontFamily` 时只取三个字段**(反编译):

```js
case "fontFamily":
  a.fontFamily = { ascii: r.attrs.ascii, hAnsi: r.attrs.hAnsi, asciiTheme: r.attrs.asciiTheme };
  // ← eastAsia / cs / eastAsiaTheme / csTheme 被丢弃
```

即使 mark 上有 `eastAsia` 属性,`SelectionState.textFormatting.fontFamily` 也拿不到。回显和写入都需要我们直接从 ProseMirror view 读取。

### 2.3 库的 setFontFamily 只设 ascii + hAnsi

```js
// chunk-SWBLJF6R.mjs
setFontFamily: (name) => createMark(schema.marks.fontFamily, { ascii: name, hAnsi: name })
// ← 不设 eastAsia
```

中文字体设到 `ascii` 在 OOXML 语义上是错的(中文字体应设 `w:eastAsia`)。需要自定义 ProseMirror 命令。

### 2.4 库字体表已有的中文支持

反编译 `chunk-AMENZY5F.mjs` 字体表,已有两个中文条目:

| OOXML 字体名 | Google Fonts 等价 | CSS fallback stack |
|---|---|---|
| `simhei` | Noto Sans SC | SimHei, Noto Sans SC, sans-serif |
| `simsun` | Noto Serif SC | SimSun, Noto Serif SC, serif |

这两个不会触发 Google Fonts 400。其他中文字体(微软雅黑/楷体/仿宋/苹方等)不在表中 → 400(用户已确认可容忍)。

### 2.5 渲染时 eastAsia 的优先级

反编译 `chunk-MOKKS75W.mjs` 渲染逻辑:

```js
a = e.fontFamily.ascii || e.fontFamily.hAnsi || e.fontFamily.eastAsia || e.fontFamily.cs || null
```

eastAsia 是第三优先级。若只设 eastAsia(不设 ascii),渲染正确使用 eastAsia。但 `toDOM` 只输出 `ascii`/`hAnsi`(见 2.2 已确认的 toDOM 代码)——若选区字体是纯 eastAsia,`toDOM` 输出空 span,但库的 `re()` 渲染函数(MOKKS75W)会用 eastAsia 生成 CSS。**两条渲染路径**需确认哪条生效:

- `re()` 是 OOXML→CSS 的运行时样式计算,用于编辑器渲染(生效)
- `toDOM` 是 ProseMirror node→DOM 的序列化(仅 mark 存在但 ascii 为空时输出空 span)

结论:设 eastAsia 后,编辑器渲染由 `re()` 处理(eastAsia 优先级兜底),显示正确。

## 三、设计决策 / Decisions

### 3.1 回显策略:精确 + 混合为空

```
选区为空(光标):
  → 显示光标处存储的字体(storedMarks 或当前节点 marks)
选区非空且所有文本节点字体一致:
  → 显示该字体
选区非空且字体不一致:
  → 回显空
```

**实现**:在 `buildSelectionFormat` 中,不直接用库的 `tf.fontFamily`,而是用 ProseMirror view 遍历选区所有文本节点,收集 fontFamily mark,判断一致性。

### 3.2 Select vs Combobox

当前 Radix Select 的 `value` 必须匹配预定义的 `SelectItem.value`。两个问题:
1. 文档中存在但不在清单中的字体 → 无法显示实际字体名(只能显示 placeholder)
2. 用户要求"显示实际字体名" → Select 不支持游离值

**决策**:用 Combobox 替换 Select。
- 项目已有 `radix-ui` 和 `popover.tsx`,缺 `cmdk`。
- shadcn Combobox = Popover + Command(cmdk) + Button。
- 需安装 `cmdk`(Bun)。
- Combobox 支持:输入搜索 + 下拉列表 + 显示当前值(即使不在列表中,也可作为输入框文本显示)。

> **回显"实际字体名"的技术约束**:Combobox 的"当前值"本质是一个 string 状态。当选区字体不在清单中时,我们把这个字体名直接塞进输入框文本——用户看到的就是实际字体名。选中清单项时,显示 label。混合选区时清空输入框。

### 3.3 中文字体写入:ascii vs eastAsia 路由

`applyFont(value)` 时根据字体名是否属于 CJK 集合,决定写入哪个 OOXML 字段:

| 字体类型 | 写入字段 | OOXML 示例 |
|---|---|---|
| 西文字体(Calibri/Arial 等) | `ascii` + `hAnsi` | `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>` |
| 中文字体(宋体/SimSun 等) | `eastAsia` | `<w:rFonts w:eastAsia="SimSun"/>` |

**回显时优先级**:`eastAsia || ascii`(中文优先显示,因为中文用户场景下 eastAsia 是视觉主导字体)。

> 注意:这与 Word 的"按字符脚本区分"逻辑不同。Word 纯中文选区显示 eastAsia,纯英文选区显示 ascii。我们简化为 `eastAsia || ascii`,因为无法在回显时判断选区字符的脚本类型(需要逐字符分析 Unicode 范围,成本高)。用户已确认"混合为空"即可,不需要区分脚本。

### 3.4 自定义 ProseMirror 命令设 eastAsia

库的 `setFontFamily(name)` 只设 ascii+hAnsi。中文字体需要自定义命令,直接操作 ProseMirror transaction:

```ts
// 伪代码:设 eastAsia mark(保留现有 ascii/hAnsi 不变)
function setEastAsiaFontFamily(view: EditorView, name: string): void {
  const { state, dispatch } = view;
  const { from, to, empty } = state.selection;
  const schema = state.schema;
  const markType = schema.marks.fontFamily;

  // 取当前选区的 fontFamily mark(若有),合并 eastAsia
  let mark = markType.create({ eastAsia: name });
  // 需保留现有 ascii/hAnsi:先读当前 mark attrs 再合并
  // ProseMirror addMark 会替换同类型 mark,需手动合并 attrs

  if (empty) {
    // 光标处:用 storedMarks
    dispatch(state.tr.setStoredMarks([...state.storedMarks?.filter(m => m.type !== markType) ?? [], mark]));
  } else {
    // 选区:先移除旧 fontFamily mark,再加合并后的
    let tr = state.tr.removeMark(from, to, markType);
    // 遍历选区,每个文本节点的旧 fontFamily attrs 合并新 eastAsia
    // 简化:统一设 eastAsia(保留旧 ascii/hAnsi 需逐节点处理)
    tr = tr.addMark(from, to, mark);
    dispatch(tr);
  }
}
```

**复杂点**:`addMark` 会替换整个 mark(不是合并 attrs)。要保留旧 ascii/hAnsi,需遍历选区每个文本节点,读其现有 fontFamily mark 的 attrs,合并 eastAsia 后重新 addMark。这是 ProseMirror 的标准模式。

### 3.5 中文字体清单

尽可能全覆盖。分两组:

**CJK 字体(写 eastAsia)**:

| 显示名 | OOXML 字体名 | 说明 |
|---|---|---|
| 宋体 | SimSun | Windows 默认中文衬线 |
| 黑体 | SimHei | Windows 默认中文无衬线 |
| 微软雅黑 | Microsoft YaHei | Windows Vista+ 默认中文 UI |
| 楷体 | KaiTi | Windows 中文楷书 |
| 仿宋 | FangSong | Windows 中文仿宋 |
| 等线 | DengXian | Windows 10+ 默认中文 |
| 苹方 | PingFang SC | macOS 默认中文无衬线 |
| 华文宋体 | STSong | macOS 中文衬线 |
| 华文楷体 | STKaiti | macOS 中文楷书 |
| 华文黑体 | STHeiti | macOS 中文黑体 |
| 思源宋体 | Noto Serif SC | 开源,Google Fonts 可加载 |
| 思源黑体 | Noto Sans SC | 开源,Google Fonts 可加载 |

**西文字体(写 ascii + hAnsi)** — 沿用现有:

| 显示名 | OOXML 字体名 |
|---|---|
| Calibri | Calibri |
| Arial | Arial |
| Times New Roman | Times New Roman |
| Georgia | Georgia |
| Courier New | Courier New |
| Cambria | Cambria |

> **思源字体的特殊性**:Noto Sans/Serif SC 在 Google Fonts 有,库的字体表虽未列(只有 simsun/simhei 映射到 Noto),但分类函数 `l()` 不会匹配它们的关键词 → 落入 sans-serif/serif 默认 → `googleFont: null` → 不会 400。但加载器仍会先尝试请求 Google Fonts。用户已确认 400 可容忍。

### 3.6 "系统默认"项的语义

`value="default"`(`font: ""`)当前 `applyFont` 直接 return 不调用命令——语义是"不操作"。用户期望可能是"清除字体格式恢复默认"。本次保持"不操作"语义(与规划文档 `2026-06-23-font-handling.md` §4.3 步骤 2 一致),清除能力留作后续。

## 四、实施步骤 / Implementation Steps

### 步骤 1:扩展 FormatState 类型

`src/stores/useDocumentStore.ts`:
- `fontFamily?: string` → `fontFamily?: { ascii?: string; eastAsia?: string } | null`
- 反映选区实际字体结构(两个独立字段)

### 步骤 2:重写 buildSelectionFormat 的字体收集

`src/features/editor/hooks/useEditorBridge.ts`:

新增 `collectFontFamilyFromSelection(view: EditorView): { ascii?: string; eastAsia?: string } | null`:
- 遍历选区所有文本节点(`doc.nodesBetween(from, to, ...)`)
- 收集每个文本节点的 `fontFamily` mark 的 `{ascii, eastAsia}`
- 若所有节点一致 → 返回该值
- 若不一致(混合)→ 返回 `null`
- 若无 fontFamily mark → 返回 `{}`
- 空选区(光标)→ 取 `storedMarks` 或 `$from.marks()` 中的 fontFamily

`buildSelectionFormat` 改为接收 ProseMirror view 参数,字体字段调用 `collectFontFamilyFromSelection`,不再用库的 `tf.fontFamily`(因库丢弃 eastAsia)。

`handleSelectionChange` 内通过 `editorRef.current?.getEditorRef()?.getView()` 获取 view 传入。

### 步骤 3:新增 CJK 字体常量

`src/features/formatting/constants.ts`:
- `FONT_FAMILIES` 扩展:加 `script: "latin" | "cjk"` 字段
- CJK 字体项的 `script: "cjk"`

### 步骤 4:新增 eastAsia 写入命令

`src/features/editor/commands.ts`:
- 新增 `execSetFontFamilyEastAsia(name: string)`:自定义 ProseMirror 命令,遍历选区合并 eastAsia(保留旧 ascii/hAnsi)

### 步骤 5:applyFont 路由

`src/features/formatting/format-apply.ts`:
- `applyFont(value)` 根据 `FONT_FAMILIES` 项的 `script` 字段路由:
  - `script: "latin"` → `execSetFontFamily(font)`(现有,设 ascii+hAnsi)
  - `script: "cjk"` → `execSetFontFamilyEastAsia(font)`(新增,设 eastAsia)

### 步骤 6:安装 cmdk + 实现 FontCombobox 组件

```bash
bun add cmdk
```

新建 `src/features/ribbon/components/FontCombobox.tsx`:
- Popover + Command(cmdk) + Button
- 可输入搜索字体名
- 显示当前值:
  - 清单项选中 → 显示 label
  - 文档字体不在清单中 → 输入框显示实际字体名(只读或可编辑)
  - 混合选区 → 输入框清空
- 选中清单项 → 调 `applyFont(value)`

### 步骤 7:改 useFontFamilyValue

`src/features/ribbon/components/RibbonFormatButtons.tsx`:
- 订阅新的 `selectionFormat.fontFamily`(对象类型 `{ascii, eastAsia} | null`)
- 返回显示字符串(非 Select value):
  - `null` 或 `{}` → `"default"`
  - `{eastAsia: "SimSun"}` → 返回 eastAsia 值
  - `{ascii: "Calibri"}` → 返回 ascii 值
  - `{eastAsia: "SimSun", ascii: "Calibri"}` → 返回 eastAsia(中文优先)
  - **混合选区**(store 层已返回 null)→ `""`

### 步骤 8:HomeTab 替换 Select 为 FontCombobox

`src/features/ribbon/components/tabs/HomeTab.tsx`:
- 字体 Select → FontCombobox
- 字号 Select 保留(不受字体回显影响)

### 步骤 9:同步测试

- `RibbonFormatButtons.test.tsx`:更新 `useFontFamilyValue` 测试为新对象类型
- `format-apply.test.ts`:新增 CJK 字体路由测试
- `HomeTab.test.tsx`:更新 mock 为新 fontFamily 结构
- `FormatPainter.test.tsx`:更新 mock 结构
- 新增混合选区回显空测试(在 `useEditorBridge` 测试或集成测试中)

## 五、验证清单 / Verification Checklist

- [ ] `bun run typecheck` 通过
- [ ] `bun run test -- --run` 全部通过
- [ ] 单元测试覆盖:
  - [ ] 混合字体选区 → `fontFamily` 返回 null → 回显空
  - [ ] 一致字体选区 → 返回该字体 → 回显精确
  - [ ] 空选区(光标)→ 返回光标处字体
  - [ ] CJK 字体写入 eastAsia,西文字体写入 ascii
  - [ ] eastAsia 优先于 ascii 回显
  - [ ] Combobox 显示不在清单中的字体名
- [ ] `bun tauri dev` 验证:
  - [ ] 选中纯中文文字 → 显示中文字体名
  - [ ] 选中纯英文文字 → 显示西文字体名
  - [ ] 选中混合字体文字 → 回显空
  - [ ] 从 FontCombobox 选择中文字体 → 编辑器渲染正确
  - [ ] 保存 .docx → `w:eastAsia` 字段正确写入

## 六、风险与约束 / Risks

| 风险 | 影响 | 缓解 |
|---|---|---|
| 自定义 PM 命令合并 eastAsia 时丢失旧 attrs | 字体格式丢失 | 遍历选区逐节点合并,非整体替换 |
| cmdk 安装增加包体积 | 构建体积 | cmdk ~5KB gzipped,可接受 |
| 混合选区检测遍历开销 | 大选区性能 | `nodesBetween` 是增量遍历,O(选区节点数);Ribbon 只在选区变化时触发 |
| 库的 toDOM 对纯 eastAsia 输出空 span | 潜在渲染问题 | 库的 `re()` 渲染函数兜底 eastAsia,需实测验证 |
| 非清单字体名在 Combobox 中无高亮 | UX 不完美 | 可接受;Combobox 显示文本即可 |
