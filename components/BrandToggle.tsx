"use client";

import { useEffect, useState } from "react";

const KEY = "tb_brand";

/** Admin only (yellow): "Brand" on puts "10bonds.com" on top of every chart and table, for screenshots to share. Remembered in this browser. The button shows on wider screens only, to keep the phone menu on one line. */
export default function BrandToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { setOn(localStorage.getItem(KEY) === "1"); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("brand-on", on);
    return () => document.documentElement.classList.remove("brand-on");
  }, [on]);
  const flip = () => {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch {}
  };
  return (
    <button type="button" onClick={flip} aria-pressed={on} data-testid="brand-toggle" title="Show 10bonds.com on charts and tables"
      className="hidden w-[76px] sm:inline-flex items-center justify-center whitespace-nowrap rounded-full bg-yellow-200 px-2 py-0.5 text-xs">
      Brand {on ? "yes" : "no"}
    </button>
  );
}
