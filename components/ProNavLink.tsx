"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** "Pro" in the menu, shown only to accounts with professional access. */
export default function ProNavLink() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    fetch("/api/pro/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setShow(b.status === "approved"))
      .catch(() => {});
  }, []);
  if (!show) return null;
  return <Link href="/pro" className="font-medium text-ink hover:text-accent" data-testid="nav-pro">Pro</Link>;
}
