/* ==========================================================================
   Ludus Ops — Radar operativo
   Lee las fuentes del sector, guarda los artículos en blog/posts.json y
   regenera blog.html a partir de scripts/blog-template.html.

   Uso local:  node scripts/fetch-feeds.mjs
   En GitHub:  .github/workflows/radar.yml (una vez al día)
   ========================================================================== */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = join(ROOT, "blog", "posts.json");
const TEMPLATE_FILE = join(ROOT, "scripts", "blog-template.html");
const OUTPUT_FILE = join(ROOT, "blog.html");

const MAX_POSTS = 100;
const MAX_PER_FEED = 8;
const MAX_AGE_DAYS = 75;
const EXCERPT_LEN = 260;

/* Fuentes verificadas. Para añadir una, copia una línea y cambia name/url. */
const FEEDS = [
  { name: "Lean.org", url: "https://www.lean.org/feed/", lang: "en" },
  { name: "iSixSigma", url: "https://www.isixsigma.com/feed/", lang: "en" },
  { name: "Process.st", url: "https://www.process.st/blog/feed/", lang: "en" },
  { name: "Zapier", url: "https://zapier.com/blog/feeds/latest/", lang: "en" },
  { name: "Supply Chain Dive", url: "https://www.supplychaindive.com/feeds/news/", lang: "en" },
  { name: "Manufacturing Dive", url: "https://www.manufacturingdive.com/feeds/news/", lang: "en" },
  { name: "Restaurant Dive", url: "https://www.restaurantdive.com/feeds/news/", lang: "en" },
  { name: "Food Dive", url: "https://www.fooddive.com/feeds/news/", lang: "en" },
  { name: "Grocery Dive", url: "https://www.grocerydive.com/feeds/news/", lang: "en" },
  { name: "CIO Dive", url: "https://www.ciodive.com/feeds/news/", lang: "en" },
  { name: "CIO", url: "https://www.cio.com/feed/", lang: "en" },
  { name: "TechRepublic", url: "https://www.techrepublic.com/rssfeeds/articles/", lang: "en" },
  { name: "IEB School", url: "https://www.iebschool.com/blog/feed/", lang: "es" },
  { name: "APD", url: "https://www.apd.es/feed/", lang: "es" }
];

const UA = "Mozilla/5.0 (compatible; LudusOpsRadar/1.0; +https://ludusops.github.io/LudusOps/)";

/* ----------------------------- XML HELPERS ------------------------------ */

function unwrapCdata(s) {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, " ");
}

const ENTITIES = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
  ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", bull: "\u2022",
  middot: "\u00B7", euro: "\u20AC", pound: "\u00A3", yen: "\u00A5",
  copy: "\u00A9", reg: "\u00AE", trade: "\u2122", deg: "\u00B0",
  times: "\u00D7", divide: "\u00F7", laquo: "\u00AB", raquo: "\u00BB",
  frac12: "\u00BD", frac14: "\u00BC", sup2: "\u00B2", sup3: "\u00B3",
  aacute: "\u00E1", eacute: "\u00E9", iacute: "\u00ED", oacute: "\u00F3",
  uacute: "\u00FA", ntilde: "\u00F1", uuml: "\u00FC", ccedil: "\u00E7",
  Aacute: "\u00C1", Eacute: "\u00C9", Iacute: "\u00CD", Oacute: "\u00D3",
  Uacute: "\u00DA", Ntilde: "\u00D1", Uuml: "\u00DC", Ccedil: "\u00C7",
  iquest: "\u00BF", iexcl: "\u00A1", szlig: "\u00DF"
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) =>
      Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : m
    );
}

function decodeAll(s) {
  let out = s;
  for (let i = 0; i < 3; i++) {
    const next = decodeEntities(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

function clean(s) {
  return stripTags(decodeAll(unwrapCdata(s || "")))
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function linkOf(block) {
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)];
  for (const l of links) {
    const href = (l[1].match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const rel = (l[1].match(/rel=["']([^"']+)["']/i) || [])[1];
    if (!rel || rel === "alternate") return href.trim();
  }
  return clean(tag(block, "link"));
}

function dateOf(block) {
  const raw =
    clean(tag(block, "pubDate")) ||
    clean(tag(block, "published")) ||
    clean(tag(block, "updated")) ||
    clean(tag(block, "dc:date"));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function tidy(s) {
  return s
    .replace(/\s*The post .*? appeared first on .*?\.?\s*$/i, "")
    .replace(/\s*(Read more|Continue reading|Leer m\u00e1s)\b.*$/i, "")
    .replace(/\s*\[\u2026\]\s*$/, "")
    .replace(/\s*\u2026\s*$/, "")
    .trim();
}

function excerptOf(block) {
  const raw = tidy(
    clean(tag(block, "description")) ||
    clean(tag(block, "summary")) ||
    clean(tag(block, "content:encoded")) ||
    clean(tag(block, "content"))
  );
  if (raw.length <= EXCERPT_LEN) return raw;
  const cut = raw.slice(0, EXCERPT_LEN);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trim() + "\u2026";
}

function parseFeed(xml, feed) {
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)
  ].map((m) => m[0]);

  const out = [];
  for (const block of blocks) {
    const title = clean(tag(block, "title"));
    const url = linkOf(block);
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    out.push({
      title,
      url,
      source: feed.name,
      lang: feed.lang,
      date: dateOf(block),
      excerpt: excerptOf(block)
    });
  }
  return out;
}

/* ------------------------------- FETCHING ------------------------------- */

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(25000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text(), feed);
}

function idOf(url) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ------------------------------ RENDERING ------------------------------- */

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function renderItems(posts) {
  if (!posts.length) {
    return '        <p class="radar__empty">Todavía no hay artículos. El radar se actualiza cada día.</p>';
  }
  return posts
    .map((p) => {
      const date = fmtDate(p.date);
      const meta = [esc(p.source), date].filter(Boolean).join(" · ");
      const excerpt = p.excerpt ? `\n            <p class="radar__excerpt">${esc(p.excerpt)}</p>` : "";
      return `          <article class="radar__item">
            <p class="radar__meta">${meta}${p.lang === "en" ? ' <span class="radar__lang">EN</span>' : ""}</p>
            <h2 class="radar__title"><a href="${esc(p.url)}" target="_blank" rel="noopener nofollow">${esc(p.title)}</a></h2>${excerpt}
            <p class="radar__link"><a href="${esc(p.url)}" target="_blank" rel="noopener nofollow">Leer en ${esc(p.source)} →</a></p>
          </article>`;
    })
    .join("\n");
}

/* -------------------------------- MAIN ---------------------------------- */

async function main() {
  let existing = [];
  try {
    existing = JSON.parse(await readFile(DATA_FILE, "utf8")).posts || [];
  } catch {
    existing = [];
  }

  const byUrl = new Map(existing.map((p) => [p.url, p]));
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  let added = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.warn(`[radar] ${FEEDS[i].name}: ${r.reason.message}`);
      return;
    }
    for (const item of r.value.slice(0, MAX_PER_FEED)) {
      if (byUrl.has(item.url)) continue;
      byUrl.set(item.url, { id: idOf(item.url), ...item });
      added++;
    }
  });

  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  const posts = [...byUrl.values()]
    .filter((p) => !p.date || new Date(p.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, MAX_POSTS);

  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify({ updated: new Date().toISOString(), posts }, null, 2) + "\n");

  const template = await readFile(TEMPLATE_FILE, "utf8");
  const html = template
    .replace("<!--ITEMS-->", renderItems(posts))
    .replace("<!--COUNT-->", String(posts.length))
    .replace("<!--UPDATED-->", fmtDate(new Date().toISOString()));
  await writeFile(OUTPUT_FILE, html);

  console.log(`[radar] ${added} nuevos · ${posts.length} en total · blog.html regenerado`);
}

main().catch((e) => {
  console.error("[radar] error:", e);
  process.exit(1);
});
