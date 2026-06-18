 // DocumentTitleBar — 文档标题栏 (Document Title Bar)
 // 显示文档名 + 修改标记 + 保存状态
 // Reference: .dev/proto/workspace.html, .dev/docs/module-split.md §3.1
 
 import { useT } from "@/lib/i18n";
 import { useDocumentStore } from "@/stores/useDocumentStore";
 
 export function DocumentTitleBar() {
   const { t } = useT();
   const documentPath = useDocumentStore((s) => s.documentPath);
   const isDirty = useDocumentStore((s) => s.isDirty);
 
   const displayName = documentPath
     ? (documentPath.split("/").pop() ?? documentPath)
     : t("document.unnamed");
 
   return (
     <div className="flex h-10 shrink-0 items-center gap-2 border-border border-b bg-background px-4">
       <span className="text-muted-foreground text-sm">{displayName}</span>
       {isDirty ? (
         <span
           className="text-muted-foreground text-xs"
           title={t("document.modified")}
         >
           ●
         </span>
       ) : null}
     </div>
   );
 }
 
