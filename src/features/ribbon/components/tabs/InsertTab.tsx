// src/features/ribbon/components/tabs/InsertTab.tsx — 插入标签页 / Insert tab
import { useState } from "react";
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
          ⊞ {t("menu.insert.table")}
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
          🔗 {t("menu.insert.link")}
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.footnote">
        <RibbonButton
          label={t("menu.insert.footnote")}
          onClick={() => setShowFootnoteDialog(true)}
          testId="ribbon-insertFootnote"
        >
          📝 {t("menu.insert.footnote")}
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.page">
        <RibbonButton
          label={t("ribbon.button.pageBreak")}
          onClick={onInsertPageBreak}
          testId="ribbon-pageBreak"
        >
          {t("ribbon.button.pageBreak")}
        </RibbonButton>
      </RibbonGroup>

      {/* 弹窗 / Dialogs */}
      {showTableGrid ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <InsertTableGrid onClose={() => setShowTableGrid(false)} />
          </div>
        </div>
      ) : null}
      {showHyperlinkDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <HyperlinkDialog onClose={() => setShowHyperlinkDialog(false)} />
          </div>
        </div>
      ) : null}
      {showFootnoteDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <FootnoteDialog onClose={() => setShowFootnoteDialog(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
