# features/template — 模板变量

> **版本**: v0.2.0-draft
> **最后更新**: 2026-06-09

> **对应 SRS**：F-130~132
> **状态**：草案

---

## 1. 模块结构

```
features/template/
├── components/
│   └── VariableForm.tsx          # 变量填充表单
└── hooks/
    └── useTemplateVars.ts       # 变量检测 + 填充
```

---

## 2. 组件契约

### VariableForm

```typescript
interface VariableFormProps {
  variables: TemplateVariable[];
  onApply: (values: Record<string, string>) => void;
  onClose: () => void;
}

interface TemplateVariable {
  name: string;         // 变量名（不含花括号），如 "项目代号"
  currentValue?: string;
  count: number;        // 在文档中出现的次数
}
```

交互：
- 检测到文档中有 `{变量名}` 时，在 Agent 侧栏或弹窗中展示变量表单
- 每行一个输入框 → 填写值 → 一键应用到全文

---

## 3. Hook 契约 — useTemplateVars

```typescript
interface UseTemplateVarsReturn {
  variables: TemplateVariable[];
  hasVariables: boolean;
  detectVariables(): void;                         // 扫描文档中所有的 {xxx}
  setVariable(name: string, value: string): void;  // 设置单个变量
  applyVariables(values: Record<string, string>): Promise<void>; // 批量应用
}

function useTemplateVars(): UseTemplateVarsReturn;
```

底层调用 `DocumentAgent.setVariable()` / `DocumentAgent.applyVariables()`。

---

## 4. 状态依赖

| Store | 读取 |
|-------|------|
| `useDocumentStore` | `editorBridge` |

---

## 5. Tauri 依赖

无。

---

## 6. 多语言

| Key | 中文 | English |
|-----|------|---------|
| `template.variablesDetected` | 检测到 {count} 个模板变量 | {count} template variables detected |
| `template.fillVariables` | 填写变量 | Fill Variables |
| `template.variableName` | 变量名 | Variable Name |
| `template.variableValue` | 变量值 | Value |
| `template.applyAll` | 全部应用 | Apply All |
| `template.noVariables` | 文档中没有模板变量 | No template variables in document |
