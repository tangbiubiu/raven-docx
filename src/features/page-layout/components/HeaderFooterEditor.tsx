// features/page-layout/components/HeaderFooterEditor.tsx — 页眉页脚编辑器 (Header Footer Editor)
// 页眉/页脚内容编辑 + 页码/日期字段插入
// Reference: .dev/plan/phase4-branch-plan.md §2.2c · FRS F-103~104
//
// ⚠️ 原型中无此编辑器的设计稿。参照 Word 的页眉页脚设计面板自行设计。

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import type { HeaderFooterConfig, HeaderFooterContent } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 当前页眉页脚配置（只读初始值） */
  initialConfig?: HeaderFooterConfig;
  /** 应用变更回调 */
  onApply?: (config: HeaderFooterConfig) => void;
};

const DEFAULT_CONTENT: HeaderFooterContent = {
  left: "",
  center: "",
  right: "",
};

const DEFAULT_CONFIG: HeaderFooterConfig = {
  header: { ...DEFAULT_CONTENT },
  footer: { ...DEFAULT_CONTENT },
  differentFirstPage: false,
  differentOddEven: false,
};

export function HeaderFooterEditor({
  open,
  onClose,
  initialConfig,
  onApply,
}: Props) {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState("header");
  const [config, setConfig] = useState<HeaderFooterConfig>(
    initialConfig ?? DEFAULT_CONFIG
  );

  // 对话框打开时重置
  // Note: 为简单起见使用 effect 同步 initialConfig
  // React Compiler 会自动处理 memoization
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setConfig(initialConfig ?? DEFAULT_CONFIG);
    }
  }

  /** 更新页眉/页脚某个区域的内容 */
  const updateContent = useCallback(
    (
      section: "header" | "footer",
      field: keyof HeaderFooterContent,
      value: string
    ) => {
      setConfig((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    },
    []
  );

  /** 在当前焦点输入框中插入字段 */
  const insertField = useCallback(
    (field: string) => {
      // 使用 document.activeElement 获取当前焦点输入框
      const activeEl = document.activeElement;
      if (!(activeEl instanceof HTMLInputElement)) {
        return;
      }

      const start = activeEl.selectionStart ?? 0;
      const end = activeEl.selectionEnd ?? 0;
      const value = activeEl.value;
      const newValue = value.slice(0, start) + field + value.slice(end);

      // 通过 input name 属性识别是哪个字段
      const name = activeEl.getAttribute("data-hf-field");
      if (!name) {
        return;
      }

      const [section, side] = name.split(".") as [
        "header" | "footer",
        keyof HeaderFooterContent,
      ];
      updateContent(section, side, newValue);

      // 恢复光标位置
      requestAnimationFrame(() => {
        const newPos = start + field.length;
        (activeEl as HTMLInputElement).setSelectionRange(newPos, newPos);
        activeEl.focus();
      });
    },
    [updateContent]
  );

  /** 应用并关闭 */
  const handleApply = useCallback(() => {
    onApply?.(config);
    onClose();
  }, [config, onApply, onClose]);

  const renderContentInputs = (section: "header" | "footer") => {
    const content = config[section];
    const fields: Array<{
      side: keyof HeaderFooterContent;
      label: string;
    }> = [
      { side: "left", label: t("headerFooter.left") },
      { side: "center", label: t("headerFooter.center") },
      { side: "right", label: t("headerFooter.right") },
    ];

    return (
      <div className="space-y-3">
        {fields.map(({ side, label }) => {
          const id = `hf-${section}-${side}`;
          return (
            <div className="flex items-center gap-2" key={side}>
              <label
                className="w-10 shrink-0 text-muted-foreground text-xs"
                htmlFor={id}
              >
                {label}
              </label>
              <Input
                className="h-8 flex-1 text-xs"
                data-hf-field={`${section}.${side}`}
                id={id}
                onChange={(e) => updateContent(section, side, e.target.value)}
                placeholder={t("headerFooter.placeholder")}
                value={content[side] ?? ""}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("headerFooter.title")}</DialogTitle>
          <DialogDescription>
            {t("headerFooter.header")} &amp; {t("headerFooter.footer")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 页眉/页脚切换 */}
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList>
              <TabsTrigger value="header">
                {t("headerFooter.header")}
              </TabsTrigger>
              <TabsTrigger value="footer">
                {t("headerFooter.footer")}
              </TabsTrigger>
            </TabsList>

            <TabsContent className="pt-3" value="header">
              {renderContentInputs("header")}
            </TabsContent>
            <TabsContent className="pt-3" value="footer">
              {renderContentInputs("footer")}
            </TabsContent>
          </Tabs>

          {/* 插入字段按钮 */}
          <div className="flex gap-1.5">
            <Button
              onClick={() => insertField("{PAGE}")}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("headerFooter.insertPageNumber")}
            </Button>
            <Button
              onClick={() => insertField("{DATE}")}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("headerFooter.insertDate")}
            </Button>
            <Button
              onClick={() => insertField("{FILENAME}")}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("headerFooter.insertFileName")}
            </Button>
          </div>

          {/* 分隔 */}
          <hr className="border-border" />

          {/* 选项 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={config.differentFirstPage}
                className="h-4 w-4 rounded border-input"
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    differentFirstPage: e.target.checked,
                  }))
                }
                type="checkbox"
              />
              {t("headerFooter.differentFirstPage")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={config.differentOddEven}
                className="h-4 w-4 rounded border-input"
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    differentOddEven: e.target.checked,
                  }))
                }
                type="checkbox"
              />
              {t("headerFooter.differentOddEven")}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            {t("dialog.cancel")}
          </Button>
          <Button onClick={handleApply} size="sm" type="button">
            {t("dialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
