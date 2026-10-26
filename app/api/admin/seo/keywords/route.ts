import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/seo/backlinkCsv";
import { serviceAccount } from "@/lib/seo/google";
import { syncKeywords } from "@/lib/seo/rankings";
import { bad, int, isoDay, isEuMarket, notFound, oneOf, seoAdmin, seoMarketOf, str } from "@/lib/seo/input";
import { EFFORT_SPLIT, FIRST_WAVE, isKcSection, KC_SECTIONS, opportunity, OPPORTUNITY_WEIGHTS, BROKERS_OWNER } from "@/lib/seo/knowledge";
import { loadPublicData } from "@/lib/brokers/store";
import { CALCULATORS } from "@/lib/seo/calculators";
import { comparisonById } from "@/lib/seo/comparisons";
import { comparisonPages, indexable } from "@/lib/seo/site";
import { deleteKeyword, importKeywordData, listGuides, listKeywords, saveKeyword } from "@/lib/seo/store";
import { gscProperty } from "@/lib/seo/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INTENTS = ["informational", "commercial", "transactional", "navigational"] as const;
const STATUSES = ["target", "in_progress", "optimised", "ranking", "dropped"] as const;
const POTENTIALS = ["high", "medium", "low"] as const;

/** One market's keywords with their Opportunity Score, and the Knowledge Center first-wave plan with live status. */
export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const market = seoMarketOf(new URL(req.url).searchParams.get("market"));
  const [keywords, guides, { pages, source }, gscSite, brokers] = await Promise.all([
    listKeywords(market), isEuMarket(market) ? listGuides(false, market) : Promise.resolve([]), comparisonPages(), gscProperty(), loadPublicData().catch(() => null),
  ]);
  const gsc = !!serviceAccount() && !!gscSite;
  const rows = keywords
    .map((k) => ({ ...k, opportunity: opportunity({ ...k, impressions: gsc && k.metricsAt ? k.impressions : null }) }))
    .sort((a, b) => (b.opportunity.score ?? -1) - (a.opportunity.score ?? -1));
  // US and UK have no first-wave plan yet: their English pages are planned from the keyword list.
  const wave = !isEuMarket(market) ? [] : FIRST_WAVE.filter((w) => w.market === market).map((w) => {
    let state: "live" | "not_indexable" | "review" | "draft" | "to_write" | "other_thread" = "to_write";
    if (w.kind === "broker") state = brokers?.countries[market].published ? "live" : "other_thread";
    else if (w.kind === "calculator") state = CALCULATORS[market].slug === w.ref ? "live" : "to_write";
    else if (w.kind === "comparison") {
      const c = pages.find((p) => p.def.id === w.ref);
      state = c && indexable(c, source) ? "live" : comparisonById(w.ref ?? "") ? "not_indexable" : "to_write";
    } else {
      const g = guides.find((x) => x.slug === w.ref);
      state = !g ? "to_write" : g.status === "published" ? "live" : g.status;
    }
    const kw = keywords.find((k) => k.keyword === w.keyword);
    return { ...w, state, keywordId: kw?.id ?? null, owner: w.kind === "broker" ? BROKERS_OWNER : null };
  });
  return NextResponse.json(
    { market, keywords: rows, wave, sections: KC_SECTIONS, effortSplit: EFFORT_SPLIT, weights: OPPORTUNITY_WEIGHTS, gscConnected: gsc },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = await req.json().catch(() => ({}));
  const market = seoMarketOf(b?.market);
  switch (b?.op) {
    case "save": {
      const keyword = str(b.keyword, 120)?.toLowerCase();
      const intent = oneOf(b.intent, INTENTS);
      const status = oneOf(b.status, STATUSES);
      if (!keyword || !intent || !status) return bad("Keyword, intent and status are needed.");
      const landing = str(b.landingPath, 200);
      if (landing && !/^\/[a-z0-9/-]*$/.test(landing)) return bad("The landing page is a site path such as /it/guide/btp.");
      const volume = int(b.volume, 0, 10_000_000);
      const volumeSource = str(b.volumeSource, 200);
      // A volume without its source would look like our own data: never store one alone.
      if (volume !== null && !volumeSource) return bad("Say where the search volume comes from (tool and month).");
      try {
        await saveKeyword({
          id: int(b.id, 1, Number.MAX_SAFE_INTEGER), market, keyword, intent, status, landingPath: landing, nextAction: str(b.nextAction, 300),
          volume, volumeSource: volume === null ? null : volumeSource, difficulty: int(b.difficulty, 0, 100),
          section: isKcSection(b.section) ? b.section : null, potential: oneOf(b.potential, POTENTIALS), verifiedAt: isoDay(b.verifiedAt),
        });
      } catch (e) {
        if ((e as { code?: string }).code === "23505") return bad("This keyword is already in the list for this market.");
        throw e;
      }
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      const id = int(b.id, 1, Number.MAX_SAFE_INTEGER);
      if (!id) return bad("Missing id.");
      await deleteKeyword(id);
      return NextResponse.json({ ok: true });
    }
    case "import": {
      // CSV from a keyword tool (Semrush, Ahrefs, Google Keyword Planner...): keyword, volume, difficulty columns.
      const source = str(b.source, 200);
      if (!source) return bad("Say which tool and month the file comes from.");
      if (typeof b.csv !== "string" || b.csv.length > 2_000_000) return bad("Attach a CSV file up to 2 MB.");
      const rows = parseCsv(b.csv);
      if (rows.length < 2) return bad("The file has no rows.");
      const head = rows[0].map((h) => h.toLowerCase().trim());
      const col = (re: RegExp) => head.findIndex((h) => re.test(h));
      const ki = col(/^(keyword|query|parola chiave|mot-clé|suchbegriff)/);
      const vi = col(/volume|searches|ricerche|recherches|suchvolumen/);
      const di = col(/difficulty|kd|difficoltà|difficulté|schwierigkeit/);
      if (ki < 0 || vi < 0) return bad("The file needs a keyword column and a volume column.");
      const num = (v: string | undefined) => {
        const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
        return v && Number.isFinite(n) && String(v).trim() !== "" ? Math.round(n) : null;
      };
      const data = rows.slice(1, 5001).filter((r) => r[ki]).map((r) => ({ keyword: r[ki].trim(), volume: num(r[vi]), difficulty: di >= 0 ? Math.min(100, num(r[di]) ?? -1) : null }))
        .map((r) => ({ ...r, difficulty: r.difficulty !== null && r.difficulty >= 0 ? r.difficulty : null }));
      const n = await importKeywordData(market, data, source);
      return NextResponse.json({ updated: n, rows: data.length });
    }
    case "sync": {
      const site = await gscProperty();
      if (!serviceAccount() || !site) return bad("Connect Search Console first (Performance tab).");
      return NextResponse.json(await syncKeywords(market, site));
    }
  }
  return bad("Unknown operation.");
}
