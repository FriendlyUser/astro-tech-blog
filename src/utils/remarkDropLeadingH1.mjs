/**
 * Starlight renders each page's frontmatter `title` as the H1. Most blog posts also
 * start their body with `# Title`, which would show the title twice, so drop a
 * level-1 heading when it is the very first block of a post. Later H1s are kept.
 */
export default function remarkDropLeadingH1() {
  return (tree, file) => {
    const path = String(file?.path ?? file?.history?.[0] ?? '').replace(/\\/g, '/');
    if (!path.includes('/content/docs/posts/')) return;
    const first = tree.children?.findIndex((n) => n.type !== 'yaml' && n.type !== 'toml');
    if (first == null || first < 0) return;
    const node = tree.children[first];
    if (node?.type === 'heading' && node.depth === 1) tree.children.splice(first, 1);
  };
}
