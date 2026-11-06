/**
 * One build-time index of every blog post, shared by the three.js homepage, the
 * Starlight sidebar, the /posts list, topic and tag pages, and the RSS feed.
 *
 * Posts are Starlight docs whose id starts with "posts/". Each post gets a topic
 * (by folder first, then keywords in its tags and title), which drives the homepage
 * constellation and the /topics pages.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Topic = { id: string; name: string; color: string; blurb: string };

export const TOPICS: Topic[] = [
  { id: 'rust', name: 'Rust', color: '#f08a5d', blurb: 'Ownership, traits, async, FFI and the crate ecosystem.' },
  { id: 'go', name: 'Go', color: '#5ad1e6', blurb: 'Services, concurrency and tooling in Go.' },
  { id: 'python', name: 'Python', color: '#f5c518', blurb: 'Scripting, web frameworks, testing and data work.' },
  { id: 'web', name: 'JavaScript & web', color: '#9ad97a', blurb: 'JavaScript, TypeScript, React, Vue, CSS and static sites.' },
  { id: 'ai', name: 'AI & data', color: '#c59cf2', blurb: 'LLMs, OCR, NLP and data pipelines.' },
  { id: 'devops', name: 'DevOps & tooling', color: '#7aa7f5', blurb: 'Containers, Git, CI and cloud hosting.' },
  { id: 'mobile', name: 'Mobile & Android', color: '#4fd1c5', blurb: 'Android libraries, Flutter, Kotlin and Swift.' },
  { id: 'dotnet', name: '.NET & C#', color: '#b18cf0', blurb: 'C#, .NET and Windows APIs.' },
  { id: 'systems', name: 'C++ & systems', color: '#e8775f', blurb: 'C++, low-level programming and automation.' },
  { id: 'latex', name: 'LaTeX', color: '#ece6da', blurb: 'Diagrams and documents in LaTeX.' },
  { id: 'invest', name: 'Investing', color: '#7be495', blurb: 'Stock screeners, market data and finance tools.' },
  { id: 'other', name: 'Everything else', color: '#8a94a8', blurb: 'Thoughts, career notes and one-off experiments.' },
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
  vue: 'web',
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

export type Post = {
  id: string;
  url: string;
  title: string;
  description: string;
  date: Date;
  /** YYYY-MM-DD */
  day: string;
  tags: string[];
  topic: string;
  imgSrc?: string;
  imgAlt?: string;
  entry: CollectionEntry<'docs'>;
};

export type TopicSummary = Topic & { count: number; posts: Post[] };

export type BlogIndex = {
  posts: Post[];
  topics: TopicSummary[];
  byTopic: Map<string, Post[]>;
  byTag: Map<string, Post[]>;
  byUrl: Map<string, Post>;
};

export const postUrl = (id: string) => `/${id}/`;
export const topicUrl = (topic: string) => `/topics/${topic}/`;
export const tagUrl = (tag: string) => `/tags/${encodeURIComponent(tag)}/`;
export const topicOf = (id: string) => TOPICS.find((t) => t.id === id) ?? TOPICS[TOPICS.length - 1]!;

function topicFor(id: string, title: string, tags: string[]): string {
  const segments = id.split('/').slice(1, -1);
  for (const seg of segments) {
    const hit = FOLDER_TOPIC[seg.toLowerCase()];
    if (hit) return hit;
  }
  const haystack = `${tags.join(' ')} ${title}`;
  for (const [topic, re] of KEYWORDS) if (re.test(haystack)) return topic;
  return 'other';
}

let cached: Promise<BlogIndex> | undefined;

/** Published posts (pubDate in the past, not drafts), newest first. Cached per build. */
export function getBlogIndex(): Promise<BlogIndex> {
  cached ??= (async () => {
    const now = Date.now();
    const entries = await getCollection('docs', (e) => e.id.startsWith('posts/'));
    const posts: Post[] = [];
    for (const entry of entries) {
      const d = entry.data;
      if (d.draft) continue;
      const date = d.pubDate ?? new Date(0);
      if (date.valueOf() > now) continue;
      posts.push({
        id: entry.id,
        url: postUrl(entry.id),
        title: d.title,
        description: d.description ?? '',
        date,
        day: date.toISOString().slice(0, 10),
        tags: d.tags,
        topic: topicFor(entry.id, d.title, d.tags),
        imgSrc: d.imgSrc,
        imgAlt: d.imgAlt ?? d.alt,
        entry,
      });
    }
    posts.sort((a, b) => b.date.valueOf() - a.date.valueOf());

    const byTopic = new Map<string, Post[]>();
    const byTag = new Map<string, Post[]>();
    for (const p of posts) {
      if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
      byTopic.get(p.topic)!.push(p);
      for (const t of new Set(p.tags.filter(Boolean))) {
        if (!byTag.has(t)) byTag.set(t, []);
        byTag.get(t)!.push(p);
      }
    }
    const topics = TOPICS.map((t) => ({ ...t, posts: byTopic.get(t.id) ?? [], count: byTopic.get(t.id)?.length ?? 0 })).filter(
      (t) => t.count > 0
    );
    return { posts, topics, byTopic, byTag, byUrl: new Map(posts.map((p) => [p.url, p])) };
  })();
  return cached;
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
