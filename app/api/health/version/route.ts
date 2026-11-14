// Which commit is live and under which release approval (10B-0007). Set by deploy.yml (flyctl deploy --env). No database.
// A release made any other way shows "unknown", which the release audit treats as not approved.
export const dynamic = "force-dynamic";
export function GET() {
  const sha = process.env.RELEASE_SHA;
  const approval = process.env.RELEASE_ID;
  return Response.json({ sha: sha && /^[0-9a-f]{40}$/.test(sha) ? sha : "unknown", approval: approval && /^(REL-\d{4}|EMERGENCY|AUTO)$/.test(approval) ? approval : "unknown" }, { headers: { "cache-control": "no-store" } });
}
