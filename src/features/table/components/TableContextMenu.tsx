// features/table/components/TableContextMenu.tsx — 表格右键菜单 (Table Context Menu)
// 提供表格操作的快捷菜单
// Reference: .dev/plan/phase4-branch-plan.md §1.1

import { useT } from "@/lib/i18n";
import { useTableOperations } from "../hooks/useTableOperations";

type TableContextMenuProps = {
  onClose: () => void;
};

/**
 * 表格右键菜单组件。
 * 提供插入/删除行列、合并/拆分单元格等操作。
 */
export function TableContextMenu({ onClose }: TableContextMenuProps) {
  const { t } = useT();
  const {
    addRowAbove,
    addRowBelow,
    addColumnLeft,
    addColumnRight,
    deleteRow,
    deleteColumn,
    mergeCells,
    splitCells,
    deleteTable,
    isInTableCell,
  } = useTableOperations();

  // 如果光标不在表格内，不渲染
  if (!isInTableCell()) {
    return null;
  }

  const menuItems = [
    {
      label: t("table.insertRow"),
      icon: "↑",
      action: addRowAbove,
      testId: "add-row-above-btn",
    },
    {
      label: t("table.insertRowBelow"),
      icon: "↓",
      action: addRowBelow,
      testId: "add-row-below-btn",
    },
    { separator: true },
    {
      label: t("table.insertCol"),
      icon: "←",
      action: addColumnLeft,
      testId: "add-col-left-btn",
    },
    {
      label: t("table.insertColRight"),
      icon: "→",
      action: addColumnRight,
      testId: "add-col-right-btn",
    },
    { separator: true },
    {
      label: t("table.deleteRow"),
      icon: "🗑",
      action: deleteRow,
      testId: "delete-row-btn",
    },
    {
      label: t("table.deleteCol"),
      icon: "🗑",
      action: deleteColumn,
      testId: "delete-col-btn",
    },
    { separator: true },
    {
      label: t("table.mergeCells"),
      icon: "⊞",
      action: mergeCells,
      testId: "merge-cells-btn",
    },
    {
      label: t("table.splitCells"),
      icon: "⊟",
      action: splitCells,
      testId: "split-cells-btn",
    },
    { separator: true },
    {
      label: t("table.deleteTable"),
      icon: "🗑",
      action: deleteTable,
      testId: "delete-table-btn",
      danger: true,
    },
  ];

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="w-56 rounded-md border bg-background p-1 shadow-md"
      data-testid="table-context-menu"
    >
      {menuItems.map((item, idx) => {
        if ("separator" in item && item.separator) {
          return <div className="my-1 h-px bg-border" key={`sep-${idx}`} />;
        }

        if ("action" in item && item.action) {
          return (
            <button
              className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent ${
                "danger" in item && item.danger
                  ? "text-destructive hover:bg-destructive/10"
                  : ""
              }`}
              data-testid={item.testId}
              key={item.testId}
              onClick={() => handleAction(item.action!)}
              type="button"
            >
              <span className="w-4 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        }

        return null;
      })}
    </div>
  );
}
