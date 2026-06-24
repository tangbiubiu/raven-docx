// src/features/ribbon/components/tabs/ViewTab.tsx — 视图标签页 / View tab

import { Bot, PanelLeft, Ruler, ZoomIn, ZoomOut } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

export function ViewTab({
  onToggleOutline,
  onZoomIn,
  onZoomOut,
  onToggleAgentSidebar,
}: RibbonCallbacks) {
  const { t } = useT();
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
        <RibbonButton
          label={t("ribbon.button.ruler")}
          testId="ribbon-toggleRuler"
        >
          <Ruler className="size-5" />
        </RibbonButton>
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
