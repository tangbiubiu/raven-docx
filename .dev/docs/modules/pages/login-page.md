# LoginPage — 登录/注册页

> ⚠️ **已废弃 (v0.2.0)**
> 开源化决策后，用户注册/登录功能已移除。
> 此文档仅保留作为历史参考，不再维护。
> 新的入口流程见 [WorkspacePage §SettingsDrawer](./workspace-page.md)。

> **来源**：`.dev/proto/login.html`
> **状态**：已废弃

---

## 1. 职责

用户首次使用时的注册/登录入口。MVP 阶段仅提供注册流程（登录可后续迭代）。

---

## 2. 组件结构

```
pages/LoginPage.tsx
├── 品牌面板 BrandPanel
│   ├── Logo + 品牌名称 ("AgentWrite")
│   ├── 一句话标语
│   └── 特性要点列表（光标即上下文 / 内联建议 / 不跳出写作流）
├── 注册表单 RegisterForm
│   ├── 姓名输入框
│   ├── 邮箱输入框
│   ├── 密码输入框
│   ├── 确认密码输入框
│   ├── 同意服务条款 checkbox
│   ├── 注册按钮（含 loading spinner）
│   └── "已有账号？登录" 链接（可先指向注册自身）
├── SSO 按钮 SSOButtons
│   ├── Google
│   ├── 微软
│   └── Apple
└── Toast 提示
```

---

## 3. 路由行为

- `useAppStore.page === "login"` 时渲染
- 注册成功 → 写入本地会话 → 跳转到 `"workspace"`

---

## 4. 状态依赖

| Store | 用途 |
|-------|------|
| `useAppStore` | 页面切换 (`setPage("workspace")`) |

不依赖其他 store。注册成功后写入 `localStorage`（key: `agentwrite:session`），格式：

```typescript
interface SessionData {
  name: string;
  email: string;
  loginAt: number; // Date.now()
}
```

---

## 5. 交互行为

| 事件 | 行为 |
|------|------|
| 提交表单 | 前端校验 → 模拟注册（1~1.6s 延迟）→ 写入 localStorage → 跳转 |
| 输入框 change | 清除该字段错误状态 |
| 确认密码 Enter | 触发提交 |
| SSO 按钮点击 | Toast 提示"演示模式"（MVP 不连接真实 SSO） |
| 登录链接 | 跳转到登录模式（切换表单 header 文案） |

---

## 6. Tauri 依赖

无。纯前端页面，不调用 Tauri 命令。

---

## 7. 多语言

| Key | 中文（默认） | English |
|-----|-------------|---------|
| `login.title` | 创建账号 | Create Account |
| `login.haveAccount` | 已有账号？ | Already have an account? |
| `login.signIn` | 登录 | Sign In |
| `login.name` | 姓名 | Name |
| `login.email` | 邮箱地址 | Email Address |
| `login.password` | 密码 | Password |
| `login.confirmPassword` | 确认密码 | Confirm Password |
| `login.agreeTerms` | 我同意服务条款和隐私政策 | I agree to Terms of Service and Privacy Policy |
| `login.register` | 注册 | Sign Up |
| `login.orWith` | 或用以下方式注册 | Or sign up with |
| `login.registering` | 注册中… | Registering… |
| `login.success` | 注册成功，正在跳转… | Registered successfully, redirecting… |
| `login.failed` | 注册失败，请稍后重试 | Registration failed, please try again |

---

## 8. 输入校验规则

| 字段 | 规则 |
|------|------|
| 姓名 | 非空，≥ 2 字符 |
| 邮箱 | 合法 email 格式 (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) |
| 密码 | ≥ 8 字符 |
| 确认密码 | 与密码一致 |
| 同意条款 | 必须勾选 |

---

## 9. 与原型差异

| 原型 | 实现 | 说明 |
|------|------|------|
| 注册表单 | 保留 | 核心流程 |
| SSO 按钮 | 保留，仅 Toast | MVP 不接入真实 SSO |
| 登录模式 | 合并到同页面 | 切换表单 header + 按钮文案 |
| localStorage session | 保留 | 简单会话管理 |
| Google Fonts / 自定义字体 | 移除 | 使用系统字体栈 |
