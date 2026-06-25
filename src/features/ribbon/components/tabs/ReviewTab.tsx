// src/features/ribbon/components/tabs/ReviewTab.tsx — 审阅标签页 / Review tab

import {
  BarChart3,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  MessageSquare,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  execAcceptAllChanges,
  execAcceptChange,
  execFindNextChange,
  execFindPreviousChange,
  execRejectAllChanges,
  execRejectChange,
  execToggleTrackChanges,
  isTrackChangesActive,
} from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import { useDocumentStore } from "@/stores/useDocumentStore";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";
import { RibbonToggleButton } from "../RibbonToggleButton";

export function ReviewTab({ onNewComment }: RibbonCallbacks) {
  const { t } = useT();
  const charCount = useDocumentStore((s) => s.charCount) ?? 0;
  const [showWordCount, setShowWordCount] = useState(false);
  const [trackChangesActive, setTrackChangesActive] = useState(false);
  const selectionInfo = useDocumentStore((s) => s.selectionInfo);

  // 选区变化时重新查询修订模式状态 / Re-query track-changes state on selection change
  useEffect(() => {
    setTrackChangesActive(isTrackChangesActive());
  }, [selectionInfo]);

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

      <RibbonSeparator />

      {/* 5.1 修订模式 / Track changes */}
      <RibbonGroup labelKey="ribbon.group.tracking">
        <RibbonToggleButton
          label={t("ribbon.button.trackChanges")}
          onPressedChange={() => {
            execToggleTrackChanges();
            setTrackChangesActive(isTrackChangesActive());
          }}
          pressed={trackChangesActive}
          testId="ribbon-trackChanges"
        >
          <FileEdit className="size-5" />
        </RibbonToggleButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 5.2 接受/拒绝/导航 / Accept/Reject/Navigate */}
      <RibbonGroup labelKey="ribbon.group.changes">
        <RibbonButton
          label={t("ribbon.button.acceptChange")}
          onClick={execAcceptChange}
          testId="ribbon-acceptChange"
        >
          <Check className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.button.rejectChange")}
          onClick={execRejectChange}
          testId="ribbon-rejectChange"
        >
          <X className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.button.nextChange")}
          onClick={execFindNextChange}
          testId="ribbon-nextChange"
        >
          <ChevronRight className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.button.previousChange")}
          onClick={execFindPreviousChange}
          testId="ribbon-previousChange"
        >
          <ChevronLeft className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      {/* 5.3 全部接受/拒绝 / Accept all / Reject all */}
      <RibbonGroup labelKey="ribbon.group.allChanges">
        <RibbonButton
          label={t("ribbon.button.acceptAllChanges")}
          onClick={execAcceptAllChanges}
          testId="ribbon-acceptAllChanges"
        >
          <CheckCheck className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.button.rejectAllChanges")}
          onClick={execRejectAllChanges}
          testId="ribbon-rejectAllChanges"
        >
          <XCircle className="size-5" />
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
