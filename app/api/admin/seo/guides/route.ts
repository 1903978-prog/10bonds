import { after, NextResponse } from "next/server";
import { bad, canonical, int, notFound, oneOf, SLUG, seoAdmin, str, strList } from "@/lib/seo/input";
import { isLocale } from "@/lib/seo/locales";
import { shareGuide } from "@/lib/seo/share";
import { guideById, guideLog, listGuides, listPeople, markStale, saveGuide } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const id = int(new URL(req.url).searchParams.get("log"), 1, Number.MAX_SAFE_INTEGER);
  if (id) return NextResponse.json({ log: await guideLog(id) }, { headers: { "Cache-Control": "no-store" } });
  const [guides, people] = await Promise.all([listGuides(), listPeople()]);
  return NextResponse.json({ guides, people }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const u = await seoAdmin();
  if (!u) return notFound();
  const b = await req.json().catch(() => ({}));
  if (b?.op === "localize") {
    // Start another language version: a draft copy in the same translation group, flagged as not yet verified.
    // The text stays in the source language until someone translates and reviews it; it is never published as is.
    const src = await guideById(int(b.id, 1, Number.MAX_SAFE_INTEGER) ?? 0);
    const target = isLocale(b.locale) ? b.locale : null;
    if (!src || !target || target === src.locale) return bad("Choose a guide and a different language.");
    const group = src.translationGroup ?? src.slug;
    if ((await listGuides(false, target)).some((g) => g.translationGroup === group)) return bad("This guide already has a version in that language.");
    try {
      const guide = await saveGuide(
        {
          ...src, id: null, locale: target, translationGroup: group, machineTranslated: true, status: "draft", publishedAt: undefined,
          slug: src.slug, title: `[${target.toUpperCase()}] ${src.title}`, note: `Draft started from the ${src.locale.toUpperCase()} version (id ${src.id}); translate and review before publishing.`,
        } as Parameters<typeof saveGuide>[0],
        u.email,
      );
      await markStale();
      return NextResponse.json({ guide });
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return bad("That language already has a guide with this URL slug; change the slug of one of them first.");
      throw e;
    }
  }
  const slug = str(b?.slug, 80);
  const title = str(b?.title, 150);
  const seoTitle = str(b?.seoTitle, 120);
  const metaDescription = str(b?.metaDescription, 300);
  const primaryKeyword = str(b?.primaryKeyword, 100);
  const bodyHtml = typeof b?.bodyHtml === "string" ? b.bodyHtml.slice(0, 200_000) : "";
  const status = oneOf(b?.status, ["draft", "review", "published"] as const);
  const locale = isLocale(b?.locale) ? b.locale : null;
  const translationGroup = str(b?.translationGroup, 80) ?? slug;
  if (!locale) return bad("Choose the language of the guide.");
  if (!slug || !SLUG.test(slug)) return bad("The URL slug may contain only lowercase letters, digits and dashes.");
  if (!title || !seoTitle || !metaDescription || !primaryKeyword || !bodyHtml.trim() || !status) return bad("Title, SEO title, description, keyword, content and status are all needed.");
  if (status === "published" && b?.machineTranslated === true && b?.markReviewed !== true) return bad("A translated draft must be reviewed by a person (tick \"Mark as reviewed\") before it is published.");
  try {
    const guide = await saveGuide(
      {
        id: int(b?.id, 1, Number.MAX_SAFE_INTEGER),
        locale, translationGroup: translationGroup && SLUG.test(translationGroup) ? translationGroup : slug,
        // Drafts made from another language stay flagged until a person reviews them; publishing needs that review.
        machineTranslated: b?.machineTranslated === true && b?.markReviewed !== true,
        slug, title, seoTitle, metaDescription, primaryKeyword, bodyHtml, status,
        relatedKeywords: strList(b?.relatedKeywords),
        relatedSlugs: strList(b?.relatedSlugs).filter((s) => SLUG.test(s)),
        authorId: int(b?.authorId, 1, Number.MAX_SAFE_INTEGER),
        reviewerId: int(b?.reviewerId, 1, Number.MAX_SAFE_INTEGER),
        noindex: b?.noindex === true,
        canonicalUrl: canonical(b?.canonicalUrl),
        markReviewed: b?.markReviewed === true,
        note: str(b?.note, 300),
      },
      u.email,
    );
    await markStale();
    // Once the answer is sent: tell the search engines, and post a newly published guide on LinkedIn and X.
    after(() => shareGuide(guide).catch(() => {}));
    return NextResponse.json({ guide });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return bad("Another guide in this language already uses this URL slug.");
    if ((e as { code?: string }).code === "23503") return bad("The chosen author or reviewer no longer exists.");
    throw e;
  }
}
