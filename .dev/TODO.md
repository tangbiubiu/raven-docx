# 文档一致性修复
- [x] v0.2.0 决策传播到所有子文档
- [x] 删除 license/login 残留
- [x] 统一品牌名称 Raven
- [x] Agent 状态机补充 edge cases
- [x] 上下文注入分级策略明确

# 现在要解决
- [ ] 超大文档性能方案：虚拟分页渲染（需与 docx-editor-core 团队确认）
- [ ] Tauri command 接口契约补全（agent_send payload 结构等）
- [ ] auth.json 环境变量方案（需确认 pi agent 支持情况）

# 数据持久化
- [ ] 自动保存与崩溃恢复实现（设计已完善，见 data-persistence.md）
