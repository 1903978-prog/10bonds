import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_PAGES } from "./adminPages";

// Static link check, runs with the unit tests before every deploy: every admin page is listed on the admin home, and every
// internal link written in the source points to a page the app defines (or to a redirect).
const ROOT = join(__dirname, "..");
const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const appFiles = walk(join(ROOT, "app"));
const routes = appFiles
  .filter((f) => /[\\/](page\.tsx|route\.ts)$/.test(f))
  .map((f) => "/" + relative(join(ROOT, "app"), f).split(sep).slice(0, -1).join("/"))
  .map((r) => (r === "/" ? "/" : r.replace(/\/$/, "")));
const routeRegexes = routes.map((r) => new RegExp("^" + r.replace(/\[[^\]/]+\]/g, "[^/]+").replace(/\./g, "\\.") + "/?$"));

async function redirectSources(): Promise<RegExp[]> {
  // @ts-expect-error plain .mjs config without types
  const cfg = (await import("../next.config.mjs")).default as { redirects?: () => Promise<{ source: string }[]> };
  const list = (await cfg.redirects?.()) ?? [];
  return list.map((r) => new RegExp("^" + r.source.replace(/:[a-z]+\*?/gi, "[^/]+") + "/?$"));
}

describe("admin home", () => {
  it("lists every admin page, and only pages that exist", () => {
    const dirs = readdirSync(join(ROOT, "app/admin"))
      .filter((n) => existsSync(join(ROOT, "app/admin", n, "page.tsx")))
      .map((n) => `/admin/${n}`)
      .sort();
    expect(ADMIN_PAGES.map((p) => p.href).sort()).toEqual(dirs);
    for (const p of ADMIN_PAGES) expect(p.desc.length).toBeGreaterThan(10);
  });
});

describe("internal links in the source", () => {
  it("every literal href points to a defined page or redirect", async () => {
    const redirects = await redirectSources();
    const src = [...appFiles, ...walk(join(ROOT, "components")), ...walk(join(ROOT, "lib"))].filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
    const bad: string[] = [];
    for (const f of src) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/href=(?:"|\{"|\{`)(\/[^"`${}?#]*)/g)) {
        const path = m[1];
        if (path === "/") continue;
        // Static files and language-prefixed pages are served by [lang] routes; dynamic parts are skipped.
        if (/\.(png|svg|jpg|ico|txt|xml|html|pdf|json)$/.test(path)) continue;
        if (routeRegexes.some((r) => r.test(path)) || redirects.some((r) => r.test(path))) continue;
        bad.push(`${relative(ROOT, f)}: ${path}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
