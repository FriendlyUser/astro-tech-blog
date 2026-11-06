/**
 * Build-time blog statistics for the portfolio homepage: groups every post into a
 * topic cluster (by folder first, then by keywords in its tags and title) so the
 * three.js "constellation" can draw one star per post.
 */

export type Topic = {
  id: string;
  name: string;
  color: string;
};

export const TOPICS: Topic[] = [
  { id: 'rust', name: 'Rust', color: '#f08a5d' },
  { id: 'go', name: 'Go', color: '#5ad1e6' },
  { id: 'python', name: 'Python', color: '#f5c518' },
  { id: 'web', name: 'JavaScript & web', color: '#9ad97a' },
  { id: 'ai', name: 'AI & data', color: '#c59cf2' },
  { id: 'devops', name: 'DevOps & tooling', color: '#7aa7f5' },
  { id: 'mobile', name: 'Mobile & Android', color: '#4fd1c5' },
  { id: 'dotnet', name: '.NET & C#', color: '#b18cf0' },
  { id: 'systems', name: 'C++ & systems', color: '#e8775f' },
  { id: 'latex', name: 'LaTeX', color: '#ece6da' },
  { id: 'invest', name: 'Investing', color: '#7be495' },
  { id: 'other', name: 'Everything else', color: '#8a94a8' },
];

const FOLDER_TOPIC: Record<string, string> = {
  rust: 'rust',
  go: 'go',
  python: 'python',
  js: 'web',
  react: 'web',
  css: 'web',
  deno: 'web',
  php: 'web',
  flutter: 'mobile',
  kotlin: 'mobile',
  net: 'dotnet',
  cpp: 'systems',
  autohotkey: 'systems',
  tex: 'latex',
  ai: 'ai',
  stonks: 'invest',
};

// Ordered: the first topic whose pattern matches wins.
const KEYWORDS: [string, RegExp][] = [
  ['invest', /\b(stonks?|stocks?|tickers?|invest\w*|trading|finance|financial|tsx|portfolio optimi[sz]ation|crypto)\b/i],
  ['ai', /\b(ai|llms?|gpt\S*|chatgpt|openai|gemini|claude|whisper\w*|dall-?e|nlp|spacy|pandas|machine learning|ml|hugging ?face|ocr|langchain|stable diffusion)\b/i],
  ['rust', /\b(rust|cargo|wasm|ffi|tokio)\b/i],
  ['go', /\b(golang|go)\b/i],
  ['python', /\b(python|django|flask|fastapi|pytest|bs4|introtopython|streamlit|dash)\b/i],
  ['dotnet', /(\bdotnet\b|\.net\b|\bc#|\bcsharp\b|\bblazor\b|\bwinapi\b)/i],
  ['systems', /(\bc\+\+|\bcpp\b|\bassembly\b|\bautohotkey\b)/i],
  ['mobile', /\b(flutter|dart|kotlin|android|ios|swift|react native)\b/i],
  ['latex', /\b(latex|tex|tikz)\b/i],
  ['devops', /\b(docker|kubernetes|k8s|git|github|ci|cd|devops|linux|wsl\d?|bash|shell|aws|azure|gcp|heroku|koyeb|nginx|apache|container\w*|terraform|cloud)\b/i],
  ['web', /\b(javascript|js|typescript|ts|react|vue\w*|svelte|astro|node(\.?js)?|deno|css|html|jsx|next\.?js|remix|php|laravel|web|svg|tailwind)\b/i],
];

export type PostStar = {
  title: string;
  url: string;
  date: string;
  topic: string;
};

export type BlogStats = {
  total: number;
  topics: (Topic & { count: number; examples: { title: string; url: string }[] })[];
  stars: PostStar[];
};

function topicFor(file: string, fm: Record<string, unknown>): string {
  const parts = file.replace(/\\/g, '/').split('/');
  const postsAt = parts.indexOf('posts');
  const segments = parts.slice(postsAt + 1, -1);
  for (const seg of segments) {
    const hit = FOLDER_TOPIC[seg.toLowerCase()];
    if (hit) return hit;
  }
  const tags = Array.isArray(fm.tags) ? (fm.tags as unknown[]).join(' ') : String(fm.tags ?? '');
  const haystack = `${tags} ${String(fm.title ?? '')}`;
  for (const [topic, re] of KEYWORDS) {
    if (re.test(haystack)) return topic;
  }
  return 'other';
}

const unquote = (s: string) => s.trim().replace(/^(['"])(.*)\1$/, '$2');

/**
 * Minimal frontmatter reader for the fields the homepage needs (title, pubDate/date,
 * tags, draft). Reading raw text instead of importing each post keeps the posts'
 * layout CSS out of the homepage bundle.
 */
export function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: Record<string, unknown> = {};
  const lines = m[1]!.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i]!.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    const val = kv[2]!.trim();
    if (key === 'tags' || key === 'categories') {
      if (val.startsWith('[')) {
        out[key] = val.replace(/^\[|\]$/g, '').split(',').map(unquote).filter(Boolean);
      } else if (val === '') {
        const items: string[] = [];
        while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1]!)) items.push(unquote(lines[++i]!.replace(/^\s*-\s+/, '')));
        out[key] = items;
      } else out[key] = [unquote(val)];
    } else if (key === 'draft') {
      out[key] = val === 'true';
    } else {
      out[key] = unquote(val);
    }
  }
  return out;
}

/** `rawPosts` comes from import.meta.glob('./posts/**\/*.{md,mdx}', { query: '?raw', import: 'default', eager: true }). */
export function blogStats(rawPosts: Record<string, string>): BlogStats {
  const now = Date.now();
  const stars: PostStar[] = [];
  for (const [file, raw] of Object.entries(rawPosts)) {
    const fm = parseFrontmatter(raw);
    const date = new Date(String(fm.pubDate ?? fm.date ?? ''));
    if (Number.isNaN(date.valueOf()) || date.valueOf() > now || fm.draft === true) continue;
    const url = file.replace(/^\.\//, '/').replace(/\.mdx?$/, '');
    stars.push({
      title: String(fm.title ?? 'Untitled').trim(),
      url,
      date: date.toISOString().slice(0, 10),
      topic: topicFor(file, fm),
    });
  }
  stars.sort((a, b) => b.date.localeCompare(a.date));

  const topics = TOPICS.map((t) => {
    const posts = stars.filter((s) => s.topic === t.id);
    return {
      ...t,
      count: posts.length,
      examples: posts.slice(0, 3).map(({ title, url }) => ({ title, url })),
    };
  }).filter((t) => t.count > 0);

  return { total: stars.length, topics, stars };
}
