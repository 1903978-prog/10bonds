import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { classificationAudit } from "@/lib/classifyAudit";

export const dynamic = "force-dynamic";

const q = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Admin only: the issuers still missing a country or an industry, as CSV (to hand to the data model).
export async function GET() {
  const u = await currentUser();
  if (!(u?.isAdmin && u.adminState === "ok")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await classificationAudit();
  if (!a) return NextResponse.json({ error: "Bond data is not connected" }, { status: 503 });
  const rows = ["issuer,bonds,example_isin,currency,missing,country_known,industry_known", ...a.missing.map((m) => [q(m.issuer), m.bonds, m.isin, m.currency, m.needs, q(m.country), q(m.sector)].join(","))];
  return new NextResponse(rows.join("\n") + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="unclassified-issuers.csv"' } });
}
