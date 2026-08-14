// features/page-layout/components/ColumnsDialog.tsx — 更多分栏对话框 (More Columns Dialog)
// 栏数 / 等宽 / 栏间距 / 分隔线;库无现成分栏对话框,参照 PageSetupDialog 自绘。

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { execSetColumns } from "@/features/editor/commands";
import { useT } from "@/lib/i18n";

const COLUMN_COUNTS = [1, 2, 3, 4] as const;

/** 栏间距预设(twips,1cm ≈ 567)/ column space presets (twips) */
const SPACE_OPTIONS = [
  { twips: 283, label: "0.5cm" },
  { twips: 425, label: "0.75cm" },
  { twips: 567, label: "1cm" },
  { twips: 850, label: "1.5cm" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ColumnsDialog({ open, onClose }: Props) {
  const { t } = useT();
  const [count, setCount] = useState(2);
  const [equalWidth, setEqualWidth] = useState(true);
  const [space, setSpace] = useState(425);
  const [separator, setSeparator] = useState(false);

  const handleApply = useCallback(() => {
    execSetColumns({
      columnCount: count,
      columnSpace: space,
      equalWidth,
      separator,
    });
    onClose();
  }, [count, equalWidth, space, separator, onClose]);

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("columns.title")}</DialogTitle>
          <DialogDescription>{t("columns.more")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 栏数 / Column count */}
          <div className="flex items-center gap-2">
            <label
              className="w-20 text-muted-foreground text-xs"
              htmlFor="columns-count"
            >
              {t("columns.count")}
            </label>
            <Select
              onValueChange={(v) => setCount(Number.parseInt(v, 10))}
              value={String(count)}
            >
              <SelectTrigger className="h-8 flex-1 text-xs" id="columns-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_COUNTS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 等宽 / Equal width */}
          <div className="flex items-center gap-2">
            <span className="w-20 text-muted-foreground text-xs">
              {t("columns.equalWidth")}
            </span>
            <div className="flex flex-1 gap-2">
              <Button
                className="flex-1"
                onClick={() => setEqualWidth(true)}
                size="sm"
                type="button"
                variant={equalWidth ? "default" : "outline"}
              >
                {t("dialog.yes")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setEqualWidth(false)}
                size="sm"
                type="button"
                variant={equalWidth ? "outline" : "default"}
              >
                {t("dialog.no")}
              </Button>
            </div>
          </div>

          {/* 栏间距 / Column spacing */}
          <div className="flex items-center gap-2">
            <label
              className="w-20 text-muted-foreground text-xs"
              htmlFor="columns-space"
            >
              {t("columns.spacing")}
            </label>
            <Select
              onValueChange={(v) => setSpace(Number.parseInt(v, 10))}
              value={String(space)}
            >
              <SelectTrigger className="h-8 flex-1 text-xs" id="columns-space">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPACE_OPTIONS.map((o) => (
                  <SelectItem key={o.twips} value={String(o.twips)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 分隔线 / Separator line */}
          <div className="flex items-center gap-2">
            <span className="w-20 text-muted-foreground text-xs">
              {t("columns.separator")}
            </span>
            <div className="flex flex-1 gap-2">
              <Button
                className="flex-1"
                onClick={() => setSeparator(true)}
                size="sm"
                type="button"
                variant={separator ? "default" : "outline"}
              >
                {t("dialog.yes")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setSeparator(false)}
                size="sm"
                type="button"
                variant={separator ? "outline" : "default"}
              >
                {t("dialog.no")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            {t("columns.cancel")}
          </Button>
          <Button onClick={handleApply} size="sm" type="button">
            {t("columns.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
