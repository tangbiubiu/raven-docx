import { ArrowDown, ArrowUp, RefreshCw, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";
import { useFindReplace } from "../hooks/use-find-replace";

/**
 * Find and replace dialog component
 * Allows users to search for text and optionally replace it
 */
export function FindReplaceDialog() {
  const { t } = useT();
  const isOpen = useAppStore((state) => state.activeModal === "findReplace");
  const closeModal = useAppStore((state) => state.closeModal);

  const {
    query,
    replaceText,
    caseSensitive,
    toggleCaseSensitive,
    results,
    currentIndex,
    setQuery,
    setReplaceText,
    findNext,
    findPrev,
    replaceCurrent,
    replaceAll,
  } = useFindReplace();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeModal]);

  if (!isOpen) {
    return null;
  }

  let matchText = "";
  if (results.length > 0) {
    matchText = t("findReplace.matchCount", {
      current: currentIndex + 1,
      total: results.length,
    });
  } else if (query.length > 0) {
    matchText = t("findReplace.noMatches");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">{t("findReplace.title")}</h2>
          <Button onClick={closeModal} size="icon" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="find-input"
            >
              {t("findReplace.find")}
            </label>
            <Input
              autoFocus
              id="find-input"
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("findReplace.findPlaceholder")}
              value={query}
            />
          </div>

          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="replace-input"
            >
              {t("findReplace.replace")}
            </label>
            <Input
              id="replace-input"
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder={t("findReplace.replacePlaceholder")}
              value={replaceText}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              checked={caseSensitive}
              className="h-4 w-4"
              id="case-sensitive"
              onChange={toggleCaseSensitive}
              type="checkbox"
            />
            <label className="text-sm" htmlFor="case-sensitive">
              {t("findReplace.caseSensitive")}
            </label>
          </div>

          {matchText !== "" && (
            <div className="text-muted-foreground text-sm">{matchText}</div>
          )}

          <div className="flex gap-2">
            <Button onClick={findPrev} size="sm" variant="outline">
              <ArrowUp className="h-4 w-4" />
              {t("findReplace.prev")}
            </Button>
            <Button onClick={findNext} size="sm" variant="outline">
              <ArrowDown className="h-4 w-4" />
              {t("findReplace.next")}
            </Button>
            <Button
              disabled={results.length === 0}
              onClick={replaceCurrent}
              size="sm"
              variant="outline"
            >
              {t("findReplace.replace")}
            </Button>
            <Button
              disabled={results.length === 0}
              onClick={replaceAll}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              {t("findReplace.replaceAll")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
