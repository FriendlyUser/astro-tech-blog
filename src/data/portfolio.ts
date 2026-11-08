/**
 * Portfolio content for the three.js homepage (src/pages/index.astro).
 *
 * Edit facts here, not in the scene code. Each career chapter maps to one
 * "district" the camera visits (see `scene` keys in src/scripts/portfolio/scene.ts).
 * Sources: friendlyuser.github.io and jobs/data/ref/resume_full.md (job_agents).
 */

export type Chapter = {
  id: string;
  scene: 'harbour' | 'foundations' | 'marketplace' | 'construction' | 'claims' | 'civic' | 'sky' | 'skyline';
  index: string;
  label: string;
  title: string;
  years?: string;
  role?: string;
  org?: string;
  location?: string;
  summary: string;
  highlights?: string[];
  tags?: string[];
};

export const profile = {
  name: 'David Li',
  handle: 'FriendlyUser',
  location: 'Vancouver, BC',
  tagline: 'I build software, blog about it, and deploy tools for investing.',
  intro:
    'Software developer with eight years across startups, insurance, construction data and the public service. I like data pipelines, AI-assisted tools and interfaces that make complicated work feel simple.',
  avatar: 'https://www.gravatar.com/avatar/d5a6e001f027e8cf3dbf048a926baa77?s=200',
};

export const links = {
  github: 'https://github.com/FriendlyUser',
  linkedin: 'https://www.linkedin.com/in/david-l-b1671a10b/',
  invest: 'https://github.com/dli-invest',
  store: 'https://TeeMugs3.redbubble.com',
  blog: '/posts/',
  topics: '/topics/',
  rss: '/rss.xml',
  source: 'https://github.com/FriendlyUser/astro-tech-blog',
  contactForm: 'https://formspree.io/f/xpqybvwy',
};

export const chapters: Chapter[] = [
  {
    id: 'hello',
    scene: 'harbour',
    index: '00',
    label: 'Vancouver, BC',
    title: "Hi, I'm David.",
    summary: profile.tagline,
  },
  {
    id: 'foundations',
    scene: 'foundations',
    index: '01',
    label: 'Foundations',
    title: 'Blueprints first.',
    years: '2018 – 2021',
    role: 'Software Developer',
    org: 'Stealth Startup',
    summary:
      'Computer engineering at UVic, then a fintech startup building mortgage questionnaires, integrations and mobile apps.',
    highlights: [
      'B.Eng. Computer Engineering, University of Victoria (class of 2019), with industry co-op terms.',
      'Built a branching online mortgage questionnaire in React and Next.js.',
      'Integrated third-party REST APIs, extended a Laravel API and wrote Postgres migrations.',
      'Shipped React Native updates and tested Node.js services with Postman and Jest.',
    ],
    tags: ['React', 'Next.js', 'React Native', 'Node.js', 'Laravel', 'PostgreSQL', 'MongoDB', 'AWS', 'Jest'],
  },
  {
    id: 'marketplace',
    scene: 'marketplace',
    index: '02',
    label: 'Marketplace',
    title: 'Search that moves.',
    years: '2021 – 2023',
    role: 'Software Engineer',
    org: 'carSHAiR',
    location: 'Remote, BC',
    summary:
      'Led the web team of a peer-to-peer car sharing marketplace, from search and maps to booking flows.',
    highlights: [
      'Rebuilt map-based search in Next.js and TypeScript with URL state and modern data fetching.',
      'Modelled booking and trip-extension flows as XState state machines.',
      'Built REST endpoints in TypeScript and shipped React Native features for iOS and Android.',
      'Reviewed pull requests and coordinated releases as web team lead.',
    ],
    tags: ['TypeScript', 'React', 'Next.js', 'XState', 'React Native', 'Node.js', 'Sass', 'Elasticsearch', 'Rollbar'],
  },
  {
    id: 'construction',
    scene: 'construction',
    index: '03',
    label: 'Construction data',
    title: 'Turning permits into data.',
    years: '2023',
    role: 'Software Engineer',
    org: 'Yellowsheet Construction Data',
    location: 'Remote, BC',
    summary:
      'Modernizing a construction-intelligence platform and automating how permits and tenders become searchable listings.',
    highlights: [
      'Built a Python and FastAPI ingestion service for 20+ BC municipalities: pdfplumber parsers, OCRmyPDF on Cloud Run, and Gemini for the hardest reports.',
      'Automated tender and permit collection from 20+ public sources on scheduled GitHub Actions, with AI project-type classification and alerts.',
      'Modernized a legacy PHP codebase with Docker, centralized logging, Playwright tests and Stripe billing.',
      'Added SSO and data sync with a companion permits app, plus Typst-generated building-permit reports.',
    ],
    tags: ['Python', 'FastAPI', 'PHP', 'MySQL', 'Gemini', 'OCRmyPDF', 'pdfplumber', 'GitHub Actions', 'Stripe', 'Playwright'],
  },
  {
    id: 'claims',
    scene: 'claims',
    index: '04',
    label: 'Claims AI',
    title: 'Documents, unfolded.',
    years: '2024',
    role: 'Software Engineer',
    org: 'Royal Claims',
    location: 'Vancouver, BC',
    summary: 'Built AI document analysis and internal tools for insurance claims.',
    highlights: [
      'Integrated OpenAI to parse and analyze claim documents and pre-fill forms from email.',
      'Built claim forms, report generation with python-docx, and SOAP integrations with Zeep.',
      'Ran Django migrations and SQL Server analysis; deployed Azure Functions and Blob Storage.',
    ],
    tags: ['Python', 'Django', 'OpenAI', 'Azure', 'SQL Server', 'Tailwind CSS'],
  },
  {
    id: 'civic',
    scene: 'civic',
    index: '05',
    label: 'Public service',
    title: 'Software for the public service.',
    years: '2025 – present',
    role: 'Software Developer (IT-02)',
    org: 'Canada School of Public Service',
    location: 'Vancouver, BC',
    summary: 'Building and modernizing internal tools, from Vue and Laravel apps to AI search and chat.',
    highlights: [
      'Migrated Laravel + Vue 2 applications to Vue 3 and Element Plus, and upgraded a Quasar app to v2 with French search.',
      'Worked on a LangChain chatbot on Azure OpenAI and an Azure AI Search index of federal regulations.',
      'Ported a scraper to a C#/.NET API published through Azure API Management.',
      'Maintain Power Apps tools and keep dependencies and security fixes current with GitHub Copilot.',
    ],
    tags: ['Vue 3', 'Laravel', 'PHP', 'C#/.NET', 'Azure', 'LangChain', 'Power Apps', 'MySQL'],
  },
  {
    id: 'writing',
    scene: 'sky',
    index: '06',
    label: 'Writing & tools',
    title: 'Hundreds of posts, one sky.',
    summary:
      'Each star is a post on this blog, grouped by topic. Hover or focus a topic to light up its constellation.',
  },
  {
    id: 'contact',
    scene: 'skyline',
    index: '07',
    label: 'Contact',
    title: "Let's build something.",
    summary: 'Open to interesting problems in data, AI tooling and web development.',
  },
];

export const skillGroups: { name: string; items: string[] }[] = [
  { name: 'Languages', items: ['Python', 'PHP', 'TypeScript', 'JavaScript', 'C#', 'SQL', 'Go', 'Rust', 'Java', 'Kotlin', 'Dart', 'C++', 'TeX'] },
  { name: 'Frontend', items: ['Vue 3', 'Quasar', 'React', 'Next.js', 'React Native', 'Flutter', 'Astro', 'Tailwind CSS', 'Sass'] },
  { name: 'Backend', items: ['Laravel', 'FastAPI', 'Django', 'Flask', 'ASP.NET', '.NET Web API', 'Node.js', 'Spring Boot', 'REST & OpenAPI', 'SOAP'] },
  { name: 'AI & data', items: ['Gemini', 'OpenAI / Azure OpenAI', 'LangChain', 'Azure AI Search', 'pandas', 'spaCy', 'NLTK', 'pdfplumber', 'OCRmyPDF', 'Streamlit'] },
  { name: 'Automation', items: ['Browser automation', 'BeautifulSoup', 'GitHub Actions', 'Scheduled pipelines', 'Discord alerts'] },
  { name: 'Data stores', items: ['MySQL / MariaDB', 'SQL Server', 'PostgreSQL', 'Cosmos DB', 'MongoDB', 'Elasticsearch'] },
  { name: 'Cloud & DevOps', items: ['Azure', 'Google Cloud Run', 'AWS', 'Docker', 'IIS', 'Linux', 'Railway'] },
  { name: 'Testing', items: ['pytest', 'Playwright', 'PHPUnit', 'Jest'] },
  { name: 'Low-code', items: ['Power Apps', 'Microsoft Lists', 'Dataverse'] },
  { name: 'AI-assisted dev', items: ['Claude Code', 'GitHub Copilot', 'Prompt engineering'] },
];

export const projects = [
  {
    name: 'LaTeX Diagrams',
    description: 'Diagrams generated for university work and collected from around the internet.',
    href: 'https://grandfleet.eu.org',
    tags: ['LaTeX', 'Nextra'],
  },
  {
    name: 'vuepress-theme-cool',
    description: 'A starter theme for VuePress, originally named vuepress-theme-school.',
    href: 'https://vuepress-theme-cool.js.org/',
    tags: ['VuePress', 'Vue'],
  },
  {
    name: 'Flipp flyer parser',
    description: 'Scrapes grocery flyers to track deals.',
    href: 'https://github.com/FriendlyUser/flipp_flyer_parser',
    tags: ['Python', 'Scraping'],
  },
  {
    name: 'Financial news NLP',
    description: 'Natural-language processing over financial news headlines.',
    href: 'https://github.com/dli-invest/fin_news_nlp',
    tags: ['spaCy', 'NLP'],
  },
];

/** Investing tools from github.com/dli-invest, shown as a ticker ribbon. */
export const investTools = [
  { name: 'halts_and_news', note: 'trading halts & news to Discord' },
  { name: 'fdrtt', note: 'live transcription of YouTube livestreams' },
  { name: 'conscrap', note: 'Yahoo Finance & CEO.ca conversation scraper (C#)' },
  { name: 'price-prediction', note: 'Prophet forecasts on GitHub Pages' },
  { name: 'cse_file_downloader', note: 'SEDAR filings downloader' },
  { name: 'earnings-ipos-stock-calendar', note: 'earnings & IPO calendars' },
  { name: 'stock_parser', note: 'TSX ticker parser' },
  { name: 'reccomendation-engine', note: 'stock recommendation engine' },
  { name: 'finreddit', note: 'finance subreddit tracker (Go)' },
  { name: 'stonk_updates', note: 'periodic ticker updates to Discord' },
];
