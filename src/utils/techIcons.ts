/**
 * Technology logos carried over from the classic homepage (/old_site), which loaded
 * them as Font Awesome brand icons from a remote kit. Here the same Font Awesome Free
 * icons are imported at build time and rendered as inline SVG (see TechIcon.astro),
 * so pages load no icon font or script.
 *
 * Colours are the ones the old site used (its Tailwind text-* classes), converted to hex.
 * Icons: Font Awesome Free, CC BY 4.0 (https://fontawesome.com/license/free).
 */
import {
  faAndroid,
  faAws,
  faBitbucket,
  faClaude,
  faCpanel,
  faCss3,
  faDocker,
  faFlutter,
  faGitAlt,
  faGithub,
  faGolang,
  faGoogle,
  faHtml5,
  faJava,
  faJira,
  faJs,
  faLaravel,
  faLinux,
  faMarkdown,
  faMicrosoft,
  faNodeJs,
  faNpm,
  faOpenai,
  faPhp,
  faPython,
  faReact,
  faRust,
  faSass,
  faStripe,
  faSwift,
  faTailwindCss,
  faTypescript,
  faUbuntu,
  faVuejs,
  faWordpress,
} from '@fortawesome/free-brands-svg-icons';
import {
  faChartLine,
  faCode,
  faDatabase,
  faMicrochip,
  faPenNib,
  faRobot,
  faSquareRootVariable,
} from '@fortawesome/free-solid-svg-icons';

export type IconDef = { prefix: string; iconName: string; icon: [number, number, unknown, unknown, string | string[]] };

/** Stable element id for an icon's <symbol> (see IconSprite.astro). */
export const iconId = (i: IconDef) => `fa-${i.prefix}-${i.iconName}`;
export type Logo = { name: string; icon: IconDef; color: string };

const logo = (name: string, icon: IconDef, color: string): Logo => ({ name, icon, color });

// Keyed by a normalized name; colours from the old SkillList/Timeline components.
const LOGOS: Record<string, Logo> = {
  python: logo('Python', faPython, '#3b82f6'),
  javascript: logo('JavaScript', faJs, '#facc15'),
  typescript: logo('TypeScript', faTypescript, '#93c5fd'),
  node: logo('Node.js', faNodeJs, '#4ade80'),
  react: logo('React', faReact, '#60a5fa'),
  vue: logo('Vue', faVuejs, '#10b981'),
  php: logo('PHP', faPhp, '#818cf8'),
  laravel: logo('Laravel', faLaravel, '#ef4444'),
  java: logo('Java', faJava, '#f87171'),
  go: logo('Go', faGolang, '#06b6d4'),
  rust: logo('Rust', faRust, '#f08a5d'),
  flutter: logo('Flutter', faFlutter, '#22d3ee'),
  android: logo('Android', faAndroid, '#22c55e'),
  swift: logo('Swift', faSwift, '#fb923c'),
  html: logo('HTML5', faHtml5, '#f97316'),
  css: logo('CSS', faCss3, '#38bdf8'),
  sass: logo('Sass', faSass, '#f472b6'),
  tailwind: logo('Tailwind CSS', faTailwindCss, '#06b6d4'),
  npm: logo('npm', faNpm, '#ef4444'),
  docker: logo('Docker', faDocker, '#3b82f6'),
  git: logo('Git', faGitAlt, '#f97316'),
  github: logo('GitHub', faGithub, '#f3f4f6'),
  bitbucket: logo('Bitbucket', faBitbucket, '#3b82f6'),
  jira: logo('Jira', faJira, '#3b82f6'),
  aws: logo('AWS', faAws, '#fb923c'),
  microsoft: logo('Microsoft', faMicrosoft, '#22d3ee'),
  google: logo('Google', faGoogle, '#60a5fa'),
  linux: logo('Linux', faLinux, '#e5e7eb'),
  ubuntu: logo('Ubuntu', faUbuntu, '#f97316'),
  cpanel: logo('cPanel', faCpanel, '#ea580c'),
  stripe: logo('Stripe', faStripe, '#6366f1'),
  openai: logo('OpenAI', faOpenai, '#f87171'),
  claude: logo('Claude', faClaude, '#d97757'),
  markdown: logo('Markdown', faMarkdown, '#ece6da'),
  wordpress: logo('WordPress', faWordpress, '#60a5fa'),
  sql: logo('SQL', faDatabase, '#fdba74'),
  ai: logo('AI', faRobot, '#eab308'),
  code: logo('Code', faCode, '#9aa3b5'),
};

// Names used across the site -> logo key.
const ALIASES: Record<string, string> = {
  js: 'javascript',
  'node.js': 'node',
  nodejs: 'node',
  'react native': 'react',
  'vue 3': 'vue',
  'vue.js': 'vue',
  golang: 'go',
  'tailwind css': 'tailwind',
  css3: 'css',
  html5: 'html',
  'github actions': 'github',
  'github copilot': 'github',
  'claude code': 'claude',
  azure: 'microsoft',
  'azure openai': 'microsoft',
  'c#': 'microsoft',
  'c#/.net': 'microsoft',
  '.net': 'microsoft',
  '.net web api': 'microsoft',
  'asp.net': 'microsoft',
  'power apps': 'microsoft',
  'microsoft lists': 'microsoft',
  'sql server': 'sql',
  mysql: 'sql',
  'mysql / mariadb': 'sql',
  postgresql: 'sql',
  mongodb: 'sql',
  'cosmos db': 'sql',
  gemini: 'google',
  'google cloud run': 'google',
  'openai / azure openai': 'openai',
  'hugging face': 'ai',
};

const norm = (s: string) => s.trim().toLowerCase();

/** Logo for a technology name, or undefined when the old icon set has none. */
export function logoFor(name: string): Logo | undefined {
  const k = norm(name);
  return LOGOS[ALIASES[k] ?? k];
}

/** Toolbox strip on the homepage (the old site's skills marquee, reimagined). */
export const TOOLBOX = [
  'python', 'typescript', 'javascript', 'php', 'laravel', 'vue', 'react', 'node',
  'go', 'rust', 'java', 'flutter', 'android', 'docker', 'aws', 'microsoft',
  'google', 'linux', 'git', 'github', 'stripe', 'openai', 'claude', 'tailwind', 'sass',
  'html', 'css', 'markdown',
].map((k) => LOGOS[k]!);

/** One icon per blog topic (colours come from the topic itself). */
export const TOPIC_ICONS: Record<string, IconDef> = {
  rust: faRust,
  go: faGolang,
  python: faPython,
  web: faJs,
  ai: faOpenai,
  devops: faDocker,
  mobile: faAndroid,
  dotnet: faMicrosoft,
  systems: faMicrochip,
  latex: faSquareRootVariable,
  invest: faChartLine,
  other: faPenNib,
};
