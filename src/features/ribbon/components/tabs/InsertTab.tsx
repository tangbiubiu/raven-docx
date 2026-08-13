// src/features/ribbon/components/tabs/InsertTab.tsx — 插入标签页 / Insert tab
import { FileText, Footprints, Link, Table } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FootnoteDialog } from "@/features/table/components/FootnoteDialog";
import { HyperlinkDialog } from "@/features/table/components/HyperlinkDialog";
import { InsertImageButton } from "@/features/table/components/InsertImageButton";
import { InsertTableGrid } from "@/features/table/components/InsertTableGrid";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

export function InsertTab({ onInsertPageBreak }: RibbonCallbacks) {
  const { t } = useT();
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [showHyperlinkDialog, setShowHyperlinkDialog] = useState(false);
  const [showFootnoteDialog, setShowFootnoteDialog] = useState(false);

  return (
    <>
      <RibbonGroup labelKey="ribbon.group.table">
        <RibbonButton
          label={t("menu.insert.table")}
          onClick={() => setShowTableGrid(true)}
          testId="ribbon-insertTable"
        >
          <Table className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.image">
        <InsertImageButton />
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.link">
        <RibbonButton
          label={t("menu.insert.link")}
          onClick={() => setShowHyperlinkDialog(true)}
          testId="ribbon-insertLink"
        >
          <Link className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.footnote">
        <RibbonButton
          label={t("menu.insert.footnote")}
          onClick={() => setShowFootnoteDialog(true)}
          testId="ribbon-insertFootnote"
        >
          <Footprints className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.page">
        <RibbonButton
          label={t("ribbon.button.pageBreak")}
          onClick={onInsertPageBreak}
          testId="ribbon-pageBreak"
        >
          <FileText className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      {/* 弹窗 / Dialogs (统一 radix Dialog,内层组件自带 p-4 与标题,外壳用 p-0 + sr-only 标题) */}
      <Dialog
        onOpenChange={(o) => !o && setShowTableGrid(false)}
        open={showTableGrid}
      >
        <DialogContent className="p-0">
          <DialogTitle className="sr-only">
            {t("menu.insert.table")}
          </DialogTitle>
          <InsertTableGrid onClose={() => setShowTableGrid(false)} />
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(o) => !o && setShowHyperlinkDialog(false)}
        open={showHyperlinkDialog}
      >
        <DialogContent className="p-0">
          <DialogTitle className="sr-only">{t("menu.insert.link")}</DialogTitle>
          <HyperlinkDialog onClose={() => setShowHyperlinkDialog(false)} />
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(o) => !o && setShowFootnoteDialog(false)}
        open={showFootnoteDialog}
      >
        <DialogContent className="p-0">
          <DialogTitle className="sr-only">
            {t("menu.insert.footnote")}
          </DialogTitle>
          <FootnoteDialog onClose={() => setShowFootnoteDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
