// src/features/ribbon/components/tabs/ReviewTab.tsx — 审阅标签页 / Review tab

import { BarChart3, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

export function ReviewTab({ onNewComment }: RibbonCallbacks) {
  const { t } = useT();
  const charCount = useDocumentStore((s) => s.charCount) ?? 0;
  const [showWordCount, setShowWordCount] = useState(false);

  return (
    <>
      <RibbonGroup labelKey="ribbon.group.comments">
        <RibbonButton
          label={t("ribbon.button.newComment")}
          onClick={onNewComment}
          testId="ribbon-newComment"
        >
          <MessageSquare className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.proofing">
        <RibbonButton
          label={t("ribbon.button.wordCount")}
          onClick={() => setShowWordCount(true)}
          testId="ribbon-wordCount"
        >
          <BarChart3 className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      {showWordCount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="min-w-[260px] rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 font-medium text-sm">
              {t("ribbon.charCount.title")}
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t("ribbon.charCount.chars")}</span>
                <span>{charCount}</span>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded bg-primary px-3 py-1.5 text-primary-foreground text-sm"
              onClick={() => setShowWordCount(false)}
              type="button"
            >
              {t("ribbon.charCount.close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
