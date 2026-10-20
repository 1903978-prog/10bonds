/** Parser for the small markdown dialect of lib/methodologyText.ts (see the comment there). */
export type Block =
  | { t: "p"; text: string }
  | { t: "formula"; text: string }
  | { t: "ol" | "ul"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "flow"; title: string; text: string; score: string }
  | { t: "pillar"; name: string; weight: number; parts: string }
  | { t: "step"; title: string; text: string }
  | { t: "stress"; name: string; base: number; stressed: number };

export type Sub = { title: string; blocks: Block[] };
export type Section = { title: string; intro: Block[]; subs: Sub[] };

export function parseMethodDoc(md: string): Section[] {
  const sections: Section[] = [];
  let sec: Section | null = null;
  let target: Block[] = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (l.startsWith("## ")) {
      sec = { title: l.slice(3), intro: [], subs: [] };
      sections.push(sec);
      target = sec.intro;
      continue;
    }
    if (!sec) continue;
    if (l.startsWith("### ")) {
      const sub = { title: l.slice(4), blocks: [] };
      sec.subs.push(sub);
      target = sub.blocks;
      continue;
    }
    const cells = (s: string) => s.slice(1, -1).split("|").map((c) => c.trim());
    if (l.startsWith("|")) {
      const head = cells(l);
      const rows: string[][] = [];
      while (lines[i + 1]?.trim().startsWith("|")) rows.push(cells(lines[++i].trim()));
      target.push({ t: "table", head, rows });
      continue;
    }
    const list = (re: RegExp) => {
      const items = [l.replace(re, "")];
      while (re.test(lines[i + 1]?.trim() ?? "") || (lines[i + 1]?.trim() === "" && re.test(lines[i + 2]?.trim() ?? ""))) {
        if (lines[i + 1].trim() === "") i++;
        items.push(lines[++i].trim().replace(re, ""));
      }
      return items;
    };
    if (/^\d+\. /.test(l)) {
      const items = list(/^\d+\. /);
      target.push(items.length > 1 ? { t: "ol", items } : { t: "p", text: l });
      continue;
    }
    if (l.startsWith("- ")) {
      target.push({ t: "ul", items: list(/^- /) });
      continue;
    }
    const parts = (s: string) => s.split("|").map((x) => x.trim());
    if (l.startsWith("@formula ")) target.push({ t: "formula", text: l.slice(9) });
    else if (l.startsWith("@flow ")) {
      const [title, text, score] = parts(l.slice(6));
      target.push({ t: "flow", title, text, score: score ?? "" });
    } else if (l.startsWith("@pillar ")) {
      const [name, weight, p] = parts(l.slice(8));
      target.push({ t: "pillar", name, weight: Number(weight), parts: p });
    } else if (l.startsWith("@step ")) {
      const [title, text] = parts(l.slice(6));
      target.push({ t: "step", title, text });
    } else if (l.startsWith("@stress ")) {
      const [name, base, stressed] = parts(l.slice(8));
      target.push({ t: "stress", name, base: Number(base), stressed: Number(stressed) });
    } else target.push({ t: "p", text: l });
  }
  return sections;
}
