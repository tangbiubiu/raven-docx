// src/features/ribbon/components/tabs/ViewTab.tsx — 视图标签页 / View tab

import { Bot, PanelLeft, Printer, Ruler, ZoomIn, ZoomOut } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import { useDocumentStore } from "@/stores/useDocumentStore";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";
import { RibbonToggleButton } from "../RibbonToggleButton";

export function ViewTab({
  onToggleOutline,
  onZoomIn,
  onZoomOut,
  onToggleAgentSidebar,
}: RibbonCallbacks) {
  const { t } = useT();
  const rulerVisible = useAppStore((s) => s.rulerVisible);
  const toggleRuler = useAppStore((s) => s.toggleRuler);
  const zoom = useDocumentStore((s) => s.zoom) ?? 100;
  const editorBridge = useDocumentStore((s) => s.editorBridge);

  return (
    <>
      <RibbonGroup labelKey="ribbon.group.view">
        <RibbonButton
          label={t("menu.view.outline")}
          onClick={onToggleOutline}
          shortcut="⌘⇧O"
          testId="ribbon-toggleOutline"
        >
          <PanelLeft className="size-5" />
        </RibbonButton>
        <RibbonToggleButton
          label={t("ribbon.button.ruler")}
          onPressedChange={toggleRuler}
          pressed={rulerVisible}
          testId="ribbon-toggleRuler"
        >
          <Ruler className="size-5" />
        </RibbonToggleButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.zoom">
        <RibbonButton
          label={t("menu.view.zoomIn")}
          onClick={onZoomIn}
          shortcut="⌘+"
          testId="ribbon-zoomIn"
        >
          <ZoomIn className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("menu.view.zoomOut")}
          onClick={onZoomOut}
          shortcut="⌘-"
          testId="ribbon-zoomOut"
        >
          <ZoomOut className="size-5" />
        </RibbonButton>
        <span className="self-center px-1 text-muted-foreground text-xs">
          {zoom}%
        </span>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.print">
        <RibbonButton
          label={t("ribbon.button.printPreview")}
          onClick={() => editorBridge?.openPrintPreview()}
          testId="ribbon-printPreview"
        >
          <Printer className="size-5" />
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.button.print")}
          onClick={() => editorBridge?.print()}
          testId="ribbon-print"
        >
          <Printer className="size-5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.agent">
        <RibbonButton
          label={t("menu.agent.panel")}
          onClick={onToggleAgentSidebar}
          shortcut="⌘⇧A"
          testId="ribbon-toggleAgentSidebar"
        >
          <Bot className="size-5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
