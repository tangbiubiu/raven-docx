// src/features/ribbon/components/tabs/LayoutTab.tsx — 布局标签页 / Layout tab
import { execIndent, execOutdent } from "@/features/editor/commands";
import { useT } from "@/lib/i18n";
import type { RibbonCallbacks } from "../Ribbon";
import { RibbonButton } from "../RibbonButton";
import { RibbonGroup } from "../RibbonGroup";
import { RibbonSeparator } from "../RibbonSeparator";

export function LayoutTab({ onPageSetup, onHeaderFooter }: RibbonCallbacks) {
  const { t } = useT();
  return (
    <>
      <RibbonGroup labelKey="ribbon.group.pageSetup">
        <RibbonButton
          label={t("pageSetup.title")}
          onClick={onPageSetup}
          testId="ribbon-pageSetup"
        >
          {t("pageSetup.title")}
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.headerFooter">
        <RibbonButton
          label={t("headerFooter.title")}
          onClick={onHeaderFooter}
          testId="ribbon-headerFooter"
        >
          {t("headerFooter.title")}
        </RibbonButton>
      </RibbonGroup>

      <RibbonSeparator />

      <RibbonGroup labelKey="ribbon.group.indent">
        <RibbonButton
          label={t("format.indent")}
          onClick={execIndent}
          testId="ribbon-indent"
        >
          → {t("format.indent")}
        </RibbonButton>
        <RibbonButton
          label={t("format.outdent")}
          onClick={execOutdent}
          testId="ribbon-outdent"
        >
          ← {t("format.outdent")}
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
