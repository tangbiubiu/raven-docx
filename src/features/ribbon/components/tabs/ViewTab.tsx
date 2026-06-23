// src/features/ribbon/components/tabs/ViewTab.tsx — 视图标签页 / View tab
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
          testId="ribbon-toggleOutline"
        >
          📑 {t("menu.view.outline")}
        </RibbonButton>
        <RibbonButton
          label={t("ribbon.button.ruler")}
          testId="ribbon-toggleRuler"
        >
          📏 {t("ribbon.button.ruler")}
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.zoom">
        <RibbonButton
          label={t("menu.view.zoomIn")}
          onClick={onZoomIn}
          testId="ribbon-zoomIn"
        >
          🔍+ {t("menu.view.zoomIn")}
        </RibbonButton>
        <RibbonButton
          label={t("menu.view.zoomOut")}
          onClick={onZoomOut}
          testId="ribbon-zoomOut"
        >
          🔍- {t("menu.view.zoomOut")}
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.agent">
        <RibbonButton
          label={t("menu.agent.panel")}
          onClick={onToggleAgentSidebar}
          testId="ribbon-toggleAgentSidebar"
        >
          🤖 {t("menu.agent.panel")}
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
