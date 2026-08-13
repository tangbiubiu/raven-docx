// src/features/ribbon/components/RibbonSeparator.tsx — 组间分隔线 / Group separator
export function RibbonSeparator() {
  // p5: 高度对齐 44px 按钮基线;宽度收窄配合 1024px 无横向滚动目标
  return <span className="mx-0.5 h-11 w-px shrink-0 bg-border" />;
}
