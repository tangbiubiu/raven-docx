// src/features/ribbon/components/tabs/ReferencesTab.tsx — 引用标签页 / References tab
import { useState } from "react";
import { FootnoteDialog } from "@/features/table/components/FootnoteDialog";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

export function ReferencesTab(_props: RibbonCallbacks) {
  const { t } = useT();
  const [showFootnoteDialog, setShowFootnoteDialog] = useState(false);

  return (
    <>
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

      <RibbonGroup labelKey="ribbon.group.toc">
        <RibbonButton
          disabled
          label={t("ribbon.button.toc")}
          testId="ribbon-toc"
        >
          {t("ribbon.button.toc")}
        </RibbonButton>
      </RibbonGroup>

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
