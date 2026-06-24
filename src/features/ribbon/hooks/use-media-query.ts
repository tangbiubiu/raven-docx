// src/features/ribbon/hooks/use-media-query.ts — 媒体查询 hook / Media query hook
import { useEffect, useState } from "react";

/**
 * 订阅 CSS 媒体查询,返回当前是否匹配。
 * / Subscribe to a CSS media query, returns whether it currently matches.
 *
 * 服务端渲染安全:matchMedia 不存在时返回 false。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    // 同步当前值(避免初始 useState 与 effect 间的竞态)
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
