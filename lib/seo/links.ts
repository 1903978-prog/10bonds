import { LOCALE, type Locale } from "./locales";

/**
 * Guide text links to other guides and comparison pages. A link whose page is not public right now (guide not yet
 * published, comparison page without enough bonds) would be a broken link, so it becomes plain text until the
 * page exists. Runs on sanitised HTML, where every link is a simple <a href="...">...</a>.
 */
export function unlinkMissing(html: string, l: Locale, guides: Set<string>, comparisons: Set<string>): string {
  const g = `/${l}/${LOCALE[l].seg.guides}/`;
  const c = `/${l}/${LOCALE[l].seg.bonds}/`;
  return html.replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (all, href: string, text: string) => {
    const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
    if (path.startsWith(g)) return guides.has(path.slice(g.length)) ? all : text;
    if (path.startsWith(c)) return comparisons.has(path.slice(c.length)) ? all : text;
    return all;
  });
}
