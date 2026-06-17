import { TextSelection } from "prosemirror-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentStore } from "@/stores/useDocumentStore";
import type { FindResult, ProsemirrorNode } from "@/types/editor";

type MatchFinder = (node: ProsemirrorNode, pos: number) => boolean;

function createMatchFinder(
  matches: FindResult[],
  pattern: string,
  searchQuery: string,
  isCaseSensitive: boolean
): MatchFinder {
  return (node, pos) => {
    if (node.isText && node.text) {
      const text = isCaseSensitive ? node.text : node.text.toLowerCase();
      let index = 0;

      while (index !== -1) {
        index = text.indexOf(pattern, index);
        if (index !== -1) {
          matches.push({
            from: pos + index,
            to: pos + index + searchQuery.length,
          });
          index += searchQuery.length;
        }
      }
    }

    return true;
  };
}

export type FindReplaceState = {
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  results: FindResult[];
  currentIndex: number;
  setQuery: (query: string) => void;
  setReplaceText: (text: string) => void;
  toggleCaseSensitive: () => void;
  findNext: () => void;
  findPrev: () => void;
  replaceCurrent: () => void;
  replaceAll: () => number;
};

/**
 * Hook for managing find and replace operations in the editor
 */
export function useFindReplace(): FindReplaceState {
  const editorBridge = useDocumentStore((state) => state.editorBridge);
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<FindResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastSearchRef = useRef("");

  const findMatches = useCallback(
    (searchQuery: string, isCaseSensitive: boolean) => {
      const view = editorBridge?.getEditorView();
      if (!view) {
        return [];
      }

      const { doc } = view.state;
      const matches: FindResult[] = [];

      if (searchQuery.length === 0) {
        return matches;
      }

      const pattern = isCaseSensitive ? searchQuery : searchQuery.toLowerCase();
      doc.descendants(
        createMatchFinder(matches, pattern, searchQuery, isCaseSensitive)
      );

      return matches;
    },
    [editorBridge]
  );

  const highlightMatch = useCallback(
    (match: FindResult | undefined) => {
      const view = editorBridge?.getEditorView();
      if (!(view && match)) {
        return;
      }

      const tr = view.state.tr.setSelection(
        TextSelection.create(view.state.doc, match.from, match.to)
      );
      view.dispatch(tr.scrollIntoView());
    },
    [editorBridge]
  );

  useEffect(() => {
    if (query !== lastSearchRef.current) {
      lastSearchRef.current = query;
      const newResults = findMatches(query, caseSensitive);
      setResults(newResults);
      setCurrentIndex(newResults.length > 0 ? 0 : -1);
    }
  }, [query, caseSensitive, findMatches]);

  const toggleCaseSensitive = useCallback(() => {
    setCaseSensitive((prev) => !prev);
  }, []);

  const findNext = useCallback(() => {
    if (results.length === 0) {
      return;
    }
    const nextIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIndex);
    highlightMatch(results[nextIndex]);
  }, [currentIndex, results, highlightMatch]);

  const findPrev = useCallback(() => {
    if (results.length === 0) {
      return;
    }
    const prevIndex =
      currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    highlightMatch(results[prevIndex]);
  }, [currentIndex, results, highlightMatch]);

  const replaceCurrent = useCallback(() => {
    const view = editorBridge?.getEditorView();
    if (!(view && results.length > 0 && currentIndex >= 0)) {
      return;
    }

    const match = results[currentIndex];
    if (!match) {
      return;
    }

    const tr = view.state.tr.insertText(replaceText, match.from, match.to);
    view.dispatch(tr);

    const newResults = findMatches(query, caseSensitive);
    setResults(newResults);
    if (newResults.length > 0) {
      const newIndex = Math.min(currentIndex, newResults.length - 1);
      setCurrentIndex(newIndex);
      highlightMatch(newResults[newIndex]);
    } else {
      setCurrentIndex(-1);
    }
  }, [
    editorBridge,
    results,
    currentIndex,
    replaceText,
    findMatches,
    query,
    caseSensitive,
    highlightMatch,
  ]);

  const replaceAll = useCallback(() => {
    const view = editorBridge?.getEditorView();
    if (!(view && results.length > 0)) {
      return 0;
    }

    let count = 0;
    for (const match of results) {
      const tr = view.state.tr.insertText(replaceText, match.from, match.to);
      view.dispatch(tr);
      count += 1;
    }

    setResults([]);
    setCurrentIndex(-1);
    return count;
  }, [editorBridge, results, replaceText]);

  return {
    query,
    replaceText,
    caseSensitive,
    results,
    currentIndex,
    setQuery,
    setReplaceText,
    toggleCaseSensitive,
    findNext,
    findPrev,
    replaceCurrent,
    replaceAll,
  };
}
