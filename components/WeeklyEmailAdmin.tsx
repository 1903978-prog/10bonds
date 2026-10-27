"use client";

import { useState } from "react";

type Status = { on: boolean; testedAt: string | null; subscribers: number; last: { week: string; sent: number; failed: number } | null; week: string };

export default function WeeklyEmailAdmin({ initial, lang }: { initial: Status; lang: string }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (action: string) => {
    setBusy(true);
    setMsg(action === "test" ? "Sending…" : "Saving…");
    const r = await fetch("/api/admin/weekly-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lang }) });
    const j = await r.json().catch(() => ({}));
    if (j.status) setS(j.status);
    setMsg(j.message ?? j.error ?? "Something went wrong.");
    setBusy(false);
  };
  return (
    <div className="mt-5 rounded-lg bg-black/[0.03] p-4 text-sm">
      <p>
        Subscribers: <strong data-testid="weekly-subscribers">{s.subscribers}</strong> · Monday sending:{" "}
        <strong className={s.on ? "text-green-700" : "text-red-700"} data-testid="weekly-on">{s.on ? "ON" : "OFF"}</strong>
        {s.last ? ` · Last week sent (${s.last.week}): ${s.last.sent} sent, ${s.last.failed} failed` : " · Never sent yet"}
      </p>
      <p className="mt-1 text-mute">{s.testedAt ? `Last test sent ${new Date(s.testedAt).toLocaleString("en-GB")}.` : "Send yourself a test first; sending can be switched on only after that."}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => act("test")} className="rounded-full bg-ink px-5 py-2 text-white disabled:opacity-50" data-testid="weekly-test">Send test to me</button>
        <button type="button" disabled={busy || (!s.on && !s.testedAt)} onClick={() => act(s.on ? "off" : "on")} className="rounded-full bg-black/5 px-5 py-2 disabled:opacity-50" data-testid="weekly-toggle">
          {s.on ? "Switch sending OFF" : "Switch sending ON"}
        </button>
        <span className="text-mute">{msg}</span>
      </div>
    </div>
  );
}
