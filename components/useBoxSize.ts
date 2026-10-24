"use client";

import { useEffect, useRef, useState } from "react";

/** The pixel size of a box, kept up to date, so a chart can draw at its real size (text stays readable). */
export function useBoxSize<T extends HTMLElement>(fallback = { w: 800, h: 360 }, min = { w: 280, h: 220 }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setSize({ w: Math.max(min.w, el.clientWidth), h: Math.max(min.h, el.clientHeight) });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, size] as const;
}
