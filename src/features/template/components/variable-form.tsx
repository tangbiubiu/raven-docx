// features/template/components/variable-form.tsx — 模板变量表单组件
// 检测文档中的模板变量并提供填写界面
// Reference: Phase 4.4a, .dev/proto/workspace.html#template-modal

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useTemplateVars } from "../hooks/use-template-vars";

type VariableFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * VariableForm — 模板变量填充表单
 * 自动检测文档中的 {变量名} 占位符，提供输入框填写，批量替换到文档
 */
export function VariableForm({ open, onOpenChange }: VariableFormProps) {
  const { t } = useT();
  const { variables, setValue, applyAll, hasVariables } = useTemplateVars();

  // 本地表单状态（每次打开 dialog 时重置）
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // 打开时初始化本地值
  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      for (const v of variables) {
        initial[v] = "";
      }
      setLocalValues(initial);
    }
  }, [open, variables]);

  const handleApply = async () => {
    // 将本地值同步到 hook
    for (const [name, value] of Object.entries(localValues)) {
      if (value.trim()) {
        setValue(name, value);
      }
    }
    await applyAll();
    onOpenChange(false);
  };

  if (!hasVariables) {
    return (
      <Dialog modal={false} onOpenChange={onOpenChange} open={open}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("template.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground">
            {t("template.noVariables")}
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              {t("dialog.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog modal={false} onOpenChange={onOpenChange} open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("template.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {variables.map((varName) => (
            <div className="space-y-2" key={varName}>
              <label className="font-medium text-sm" htmlFor={`var-${varName}`}>
                {varName}
              </label>
              <Input
                id={`var-${varName}`}
                onChange={(e) =>
                  setLocalValues((prev) => ({
                    ...prev,
                    [varName]: e.target.value,
                  }))
                }
                placeholder={t("template.input.placeholder", {
                  name: varName,
                })}
                value={localValues[varName] ?? ""}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {t("dialog.cancel")}
          </Button>
          <Button onClick={handleApply}>{t("template.fillAll")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
