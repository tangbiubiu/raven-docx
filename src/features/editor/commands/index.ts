// editor/commands/index.ts — 命令域聚合出口(Barrel)。
// 保持与原单文件 commands.ts 完全相同的公开 API;消费方仍从
// "@/features/editor/commands" 导入,解析到本目录。
//
// 按域拆分(roadmap §8):
// - shared:             EditorView 获取 / 命令派发 / applyBatch(仅 applyBatch 公开)
// - formatting:         marks、字体/字号/颜色/高亮、链接
// - paragraph:          块类型、对齐、列表、缩进、行距/段距/缩进
// - styles:             段落样式(样式库)
// - table:              表格命令
// - image:              图片命令
// - review:             修订(track changes)
// - document-structure: 分页符、目录、分节符、分栏、水印
// - history:            撤销/重做

// biome-ignore-all lint/performance/noBarrelFile: 聚合出口保留原 import 兼容(拆分过渡期;后续消费方收敛子路径导入后删除)
export * from "./document-structure";
export * from "./formatting";
export * from "./history";
export * from "./image";
export * from "./paragraph";
export * from "./review";
export { applyBatch } from "./shared";
export * from "./styles";
export * from "./table";
