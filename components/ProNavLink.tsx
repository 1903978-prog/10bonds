"use client";

import NavLink from "@/components/NavLink";
import { useEffect, useState } from "react";

/** "Pro" in the menu, shown only to approved professionals and the admin. Others request access from Pricing. */
export default function ProNavLink() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    fetch("/api/pro/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setShow(b.status === "approved"))
      .catch(() => {});
  }, []);
  if (!show) return null;
  return <NavLink href="/pro" testId="nav-pro">Pro</NavLink>;
}
