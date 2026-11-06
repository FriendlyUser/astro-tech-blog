/**
 * Portfolio page controller: scroll -> continuous chapter progress for the camera,
 * reveals, chapter rail / mobile dock, topic <-> constellation highlighting, mobile
 * menu and a fine-pointer cursor ring. The three.js scene is loaded lazily so the
 * text is usable immediately and still works without WebGL.
 */
import type { PortfolioScene, SceneData } from './scene';

const root = document.documentElement;
root.classList.add('pf-booted');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const compact = window.matchMedia('(max-width: 860px)').matches;

const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-chapter]'));
const railLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-rail]'));
const foregrounds = Array.from(document.querySelectorAll<SVGElement>('[data-fg]'));
const labels = Array.from(document.querySelectorAll<HTMLElement>('[data-label]'));
const dockNum = document.querySelector<HTMLElement>('[data-dock-num]');
const dockLabel = document.querySelector<HTMLElement>('[data-dock-label]');
const data = JSON.parse(document.getElementById('pf-data')?.textContent || '{}') as SceneData;

let scene: PortfolioScene | null = null;

// ---------------------------------------------------------------- scroll progress
let anchors: number[] = [];
function measure() {
  measureColumn();
  const vh = window.innerHeight;
  anchors = sections.map((s) => s.getBoundingClientRect().top + window.scrollY - vh * 0.35);
  anchors[0] = 0;
}

function progress(): number {
  const y = window.scrollY;
  const n = anchors.length;
  if (n === 0) return 0;
  // Last chapter is reached when the page bottom arrives, even if its section is short.
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  if (y >= maxY - 2) return n - 1;
  for (let i = n - 1; i >= 0; i--) {
    if (y >= anchors[i]!) {
      if (i === n - 1) return i;
      const next = Math.min(anchors[i + 1]!, maxY);
      return i + Math.min(1, (y - anchors[i]!) / Math.max(1, next - anchors[i]!));
    }
  }
  return 0;
}

let active = -1;
function setActive(i: number) {
  if (i === active) return;
  active = i;
  railLinks.forEach((a, k) => {
    a.classList.toggle('is-active', k === i);
    if (k === i) a.setAttribute('aria-current', 'step');
    else a.removeAttribute('aria-current');
  });
  foregrounds.forEach((f, k) => f.classList.toggle('is-active', k === i));
  const s = sections[i];
  if (s && dockNum && dockLabel) {
    dockNum.textContent = s.querySelector('.kicker__num')?.textContent ?? String(i).padStart(2, '0');
    dockLabel.textContent = railLinks[i]?.querySelector('.pf-rail__label')?.textContent ?? '';
  }
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const p = progress();
    setActive(Math.min(sections.length - 1, Math.round(p)));
    scene?.setProgress(p);
  });
}

// ---------------------------------------------------------------- reveals
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      e.target.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      io.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -20% 0px', threshold: 0.01 }
);
sections.forEach((s) => io.observe(s));

// ---------------------------------------------------------------- navigation
const menu = document.querySelector<HTMLButtonElement>('.pf-menu');
const menuLinks = document.getElementById('pf-links');
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  menuLinks?.classList.remove('is-open');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menuLinks?.classList.toggle('is-open', open);
});
menuLinks?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a')) closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

function goTo(i: number) {
  const s = sections[Math.max(0, Math.min(sections.length - 1, i))];
  s?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
  b.addEventListener('click', () => goTo(Math.max(active, 0) + Number(b.dataset.step)))
);

// ---------------------------------------------------------------- topics <-> constellation
let pinned = -1;
const topicButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-topic]'));
function highlight(k: number) {
  topicButtons.forEach((b) => b.classList.toggle('is-on', Number(b.dataset.topic) === k));
  scene?.setHighlight(k);
}
topicButtons.forEach((b) => {
  const k = Number(b.dataset.topic);
  b.addEventListener('pointerenter', () => highlight(k));
  b.addEventListener('focus', () => highlight(k));
  b.addEventListener('pointerleave', () => highlight(pinned));
  b.addEventListener('blur', () => highlight(pinned));
  b.addEventListener('click', () => {
    pinned = pinned === k ? -1 : k;
    topicButtons.forEach((o) => o.setAttribute('aria-pressed', String(Number(o.dataset.topic) === pinned)));
    highlight(pinned === -1 ? k : pinned);
  });
});

// Labels never sit on top of the text column: anything left of it is hidden.
const intro = document.querySelector<HTMLElement>('.writing__intro');
let columnRight = 0;
function measureColumn() {
  columnRight = intro && window.innerWidth > 860 ? intro.getBoundingClientRect().right + 24 : 0;
}
function placeLabels(list: { x: number; y: number; alpha: number }[]) {
  list.forEach((l, k) => {
    const el = labels[k];
    if (!el) return;
    el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    el.style.opacity = (l.x - 40 < columnRight ? 0 : l.alpha).toFixed(2);
  });
}

// ---------------------------------------------------------------- cursor ring (fine pointers only)
if (finePointer && !reducedMotion) {
  const ring = document.createElement('div');
  ring.className = 'pf-cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);
  let tx = -100;
  let ty = -100;
  let x = tx;
  let y = ty;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    ring.classList.toggle('is-link', !!(e.target as HTMLElement).closest('a, button, input, textarea'));
    scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  });
  const follow = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
}

// ---------------------------------------------------------------- boot
measure();
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  measure();
  onScroll();
});
// Fonts/images can shift section offsets after load.
window.addEventListener('load', () => {
  measure();
  onScroll();
});

const canvas = document.getElementById('pf-scene') as HTMLCanvasElement | null;
if (canvas) {
  import('./scene')
    .then(({ createScene }) => {
      scene = createScene(canvas, data, { reducedMotion, compact, onLabels: placeLabels });
      if (!scene) {
        root.classList.add('no-webgl');
        return;
      }
      scene.setProgress(progress());
      scene.start();
      requestAnimationFrame(() => root.classList.add('is-ready'));
    })
    .catch((err) => {
      console.error('Portfolio scene failed to load', err);
      root.classList.add('no-webgl');
    });
}
