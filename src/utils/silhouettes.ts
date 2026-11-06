/**
 * Seeded, procedural foreground silhouettes (SVG path data in a 1440 x 240 box).
 * Each chapter gets a near-black skyline pinned to the bottom of the viewport that
 * fades and blurs out on chapter handoff, giving the 3D scene a foreground layer
 * without any image assets.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1440;
const H = 240;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Low rolling ground line with optional blocks rising out of it. */
function skyline(rand: () => number, maxH: number, minW: number, maxW: number, gapChance: number) {
  let d = `M0 ${H} L0 ${H - 18}`;
  let x = 0;
  while (x < W) {
    const w = minW + rand() * (maxW - minW);
    if (rand() < gapChance) {
      d += ` L${r1(x)} ${H - 14 - rand() * 8} L${r1(x + w)} ${H - 14 - rand() * 8}`;
    } else {
      const h = 30 + rand() * maxH;
      d += ` L${r1(x)} ${r1(H - h)} L${r1(x + w)} ${r1(H - h)}`;
      if (rand() < 0.25) {
        // antenna / rooftop detail
        const ax = x + w * (0.3 + rand() * 0.4);
        d += ` L${r1(x + w)} ${r1(H - h)} M${r1(ax)} ${r1(H - h)} L${r1(ax)} ${r1(H - h - 10 - rand() * 18)} L${r1(ax + 2)} ${r1(H - h - 10)} L${r1(ax + 2)} ${r1(H - h)} M${r1(x + w)} ${r1(H - h)}`;
      }
    }
    x += w;
  }
  return d + ` L${W} ${H} Z`;
}

function pilings(rand: () => number) {
  let d = '';
  for (let x = 20; x < W; x += 60 + rand() * 90) {
    const h = 40 + rand() * 50;
    const w = 6 + rand() * 6;
    d += `M${r1(x)} ${H} L${r1(x)} ${r1(H - h)} L${r1(x + w)} ${r1(H - h - 3)} L${r1(x + w)} ${H} Z `;
  }
  // a dock deck across the bottom
  return d + `M0 ${H} L0 ${H - 26} L${W} ${H - 22} L${W} ${H} Z`;
}

function crane(x: number, h: number, jib: number) {
  const top = H - h;
  return (
    `M${x} ${H} L${x} ${top} L${x + 10} ${top} L${x + 10} ${H} Z ` +
    `M${x - jib * 0.3} ${top} L${x + jib} ${top} L${x + jib} ${top + 6} L${x - jib * 0.3} ${top + 6} Z ` +
    `M${x + jib * 0.8} ${top + 6} L${x + jib * 0.8 + 1.5} ${top + 6} L${x + jib * 0.8 + 1.5} ${top + 70} L${x + jib * 0.8} ${top + 70} Z ` +
    `M${x - jib * 0.3} ${top + 6} L${x - jib * 0.3 + 26} ${top + 6} L${x - jib * 0.3 + 26} ${top + 24} L${x - jib * 0.3} ${top + 24} Z `
  );
}

function columns(rand: () => number) {
  let d = `M0 ${H} L0 ${H - 22} L${W} ${H - 22} L${W} ${H} Z `;
  const cx = W * (0.62 + rand() * 0.1);
  const n = 8;
  const span = 520;
  const top = H - 150;
  d += `M${cx - span / 2 - 20} ${top} L${cx} ${top - 60} L${cx + span / 2 + 20} ${top} Z `;
  d += `M${cx - span / 2 - 24} ${top} L${cx + span / 2 + 24} ${top} L${cx + span / 2 + 24} ${top + 12} L${cx - span / 2 - 24} ${top + 12} Z `;
  for (let i = 0; i < n; i++) {
    const x = cx - span / 2 + (span / (n - 1)) * i - 9;
    d += `M${r1(x)} ${H - 22} L${r1(x)} ${top + 12} L${r1(x + 18)} ${top + 12} L${r1(x + 18)} ${H - 22} Z `;
  }
  return d;
}

function lamps(rand: () => number) {
  let d = '';
  for (let x = 40; x < W; x += 180 + rand() * 80) {
    d += `M${r1(x)} ${H} L${r1(x)} ${H - 120} L${r1(x + 34)} ${H - 124} L${r1(x + 34)} ${H - 118} L${r1(x + 4)} ${H - 114} L${r1(x + 4)} ${H} Z `;
  }
  return d;
}

function stacks(rand: () => number) {
  let d = '';
  for (let x = 30; x < W; x += 140 + rand() * 120) {
    let y = H;
    const n = 3 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const w = 60 + rand() * 30;
      const off = (rand() - 0.5) * 10;
      d += `M${r1(x + off)} ${r1(y)} L${r1(x + off + 4)} ${r1(y - 9)} L${r1(x + off + w + 4)} ${r1(y - 9)} L${r1(x + off + w)} ${r1(y)} Z `;
      y -= 9;
    }
  }
  return d;
}

function hills(rand: () => number) {
  let d = `M0 ${H}`;
  for (let x = 0; x <= W; x += 40) {
    const y = H - 40 - Math.sin(x / 210 + rand() * 0.3) * 18 - rand() * 10;
    d += ` L${x} ${r1(y)}`;
  }
  return d + ` L${W} ${H} Z`;
}

export function silhouette(kind: string, seed: number): string {
  const rand = rng(seed * 9973);
  switch (kind) {
    case 'harbour':
      return pilings(rand);
    case 'foundations':
      return skyline(rand, 50, 30, 90, 0.35);
    case 'marketplace':
      return lamps(rand) + skyline(rand, 40, 40, 120, 0.4);
    case 'construction':
      return crane(W * 0.76, 210, 260) + crane(W * 0.12, 150, 160) + skyline(rand, 60, 40, 110, 0.3);
    case 'claims':
      return stacks(rand) + `M0 ${H} L0 ${H - 16} L${W} ${H - 16} L${W} ${H} Z`;
    case 'civic':
      return columns(rand);
    case 'sky':
      return hills(rand);
    default:
      return skyline(rand, 110, 26, 80, 0.12);
  }
}
