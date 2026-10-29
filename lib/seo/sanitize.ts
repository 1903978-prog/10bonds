// Guide bodies are HTML written in the admin page. Before they are shown, everything outside a short list of
// text tags is removed: no scripts, styles, iframes, forms, event handlers, inline styles or javascript: links.

const ALLOWED = new Set(["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "a", "br", "blockquote", "code", "table", "thead", "tbody", "tr", "th", "td", "caption", "sup", "sub", "hr"]);
const VOID = new Set(["br", "hr"]);
// Tags whose content is dropped along with the tag.
const DROP_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "textarea", "select", "title", "head"]);

const escapeText = (s: string) => s.replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A link the guide may contain: site paths, anchors, http(s) and mailto. */
export function safeHref(raw: string): string | null {
  const v = raw.trim().replace(/&amp;/g, "&");
  if (/^(\/(?!\/)|#)/.test(v)) return v;
  if (/^(https?:|mailto:)/i.test(v) && !/[\s<>"]/.test(v)) return v;
  return null;
}

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
}

export function sanitizeHtml(html: string): string {
  const src = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  const out: string[] = [];
  const open: string[] = [];
  let dropping: string | null = null;
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const text = src.slice(last, m.index);
    last = re.lastIndex;
    if (!dropping) out.push(escapeText(text));
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (dropping) {
      if (closing && tag === dropping) dropping = null;
      continue;
    }
    if (DROP_CONTENT.has(tag)) {
      if (!closing && m[4] !== "/") dropping = tag;
      continue;
    }
    if (!ALLOWED.has(tag)) continue;
    if (closing) {
      const i = open.lastIndexOf(tag);
      if (i === -1) continue;
      while (open.length > i) out.push(`</${open.pop()}>`);
      continue;
    }
    if (VOID.has(tag)) {
      out.push(`<${tag}>`);
      continue;
    }
    let attrs = "";
    if (tag === "a") {
      const href = safeHref(attr(m[3], "href") ?? "");
      if (href) attrs += ` href="${escapeAttr(href)}"`;
      if (href && /^https?:/i.test(href)) attrs += ` rel="noopener nofollow"`;
      if (attr(m[3], "class") === "cta") attrs += ` class="cta"`; // the one allowed class: a call-to-action button
    }
    if (tag === "h2" || tag === "h3") {
      const id = attr(m[3], "id");
      if (id && /^[a-z0-9-]{1,60}$/.test(id)) attrs += ` id="${id}"`;
    }
    if ((tag === "th" || tag === "td") && attr(m[3], "scope") && /^(row|col)$/.test(attr(m[3], "scope")!)) attrs += ` scope="${attr(m[3], "scope")}"`;
    out.push(`<${tag}${attrs}>`);
    open.push(tag);
  }
  if (!dropping) out.push(escapeText(src.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("");
}

/** Question/answer pairs of a guide's FAQ: each h3 after an h2 named "FAQ" (in any of our languages) and its first paragraph. */
export function faqFromHtml(html: string): { q: string; a: string }[] {
  const start = html.search(/<h2[^>]*>\s*(domande frequenti|questions fréquentes|frequently asked questions|faq|häufige fragen)[^<]*<\/h2>/i);
  if (start === -1) return [];
  const rest = html.slice(start).replace(/^<h2[\s\S]*?<\/h2>/i, "");
  const section = rest.split(/<h2|<hr/i)[0];
  const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  return [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => ({ q: plain(m[1]), a: plain(m[2]) })).filter((x) => x.q && x.a);
}

/** Visible words in an HTML fragment. */
export function wordCount(html: string): number {
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
