// src/features/ribbon/components/tabs/ReferencesTab.tsx — 引用标签页 / References tab

import { Footprints, ListTree } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { execGenerateTOC } from "@/features/editor/commands";
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
          <Footprints className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.toc">
        <RibbonButton
          label={t("ribbon.button.toc")}
          onClick={execGenerateTOC}
          testId="ribbon-toc"
        >
          <ListTree className="size-5" />
        </RibbonButton>
      </RibbonGroup>

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
