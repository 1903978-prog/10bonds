import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { SKILL_MAX, loadSkills, saveSkill, type SkillKey } from "@/lib/gptRatingsDb";

export const dynamic = "force-dynamic";

const KEYS: SkillKey[] = ["irbr", "lr_gov", "lr_corp"];

/** Admin only: save one of the three skill texts. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!(u?.isAdmin && u.adminState === "ok")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  const key = b?.key as SkillKey;
  if (!KEYS.includes(key) || typeof b?.text !== "string") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (b.text.length > SKILL_MAX) return NextResponse.json({ error: `Too long (max ${SKILL_MAX} characters)` }, { status: 413 });
  await saveSkill(key, b.text);
  return NextResponse.json(await loadSkills());
}
