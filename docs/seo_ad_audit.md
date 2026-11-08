# SEO and ad revenue audit: friendlyuser.github.io

Audit date: 2026-11-08. Sources: this repo at `4e22fdb`, the local `dist/` build (the same build that is live, since `sitemap-0.xml` is 85,854 bytes in both), live HTTP checks with `curl`, the live site in a browser, and public search results.

I could not see Search Console or AdSense data. Several findings below need those dashboards to confirm (see "Data needed" at the end).

## Status of fixes (2026-11-08, uncommitted)

The quick technical fixes are made in the working tree. Nothing is committed or deployed yet.

| Finding | Change |
|---|---|
| 2: mirror | `.github/workflows/build_app.yml` no longer deploys to `gh-pages`. It is now a build check on `feature/*` pushes and PRs. **You still need to turn off Pages** for `FriendlyUser/astro-tech-blog` (**Settings → Pages**); until then the old mirror stays live. |
| 3: Medium canonical | `scripts/upload_to_medium.py` now sends `https://friendlyuser.github.io/posts/…/slug/` (URL-encoded, with no `.md`). Copies already on Medium must be fixed by hand in Medium. |
| 5: analytics | The dead `UA-119155027-6` tag is removed everywhere. GA4 loads once `GA4_ID` is set in `src/utils/analytics.mjs`; that file is also the single place for the AdSense client ID. The no-op GTM `<noscript>` is removed from `src/templates/Base.astro`. |
| 6: sitemap and robots | `public/robots.txt` has a `Sitemap:` line. The sitemap drops `/tags/*`, `/old_site/` and `ads.txt`, and posts get `<lastmod>` from `pubDate`. Tag pages with fewer than 3 posts get `noindex, follow`. |
| 7: metadata | New `src/components/starlight/Head.astro` adds the post tags listed below and adds `noindex` to the 404 page. `/old_site/` is `noindex, follow`. |
| 9: headings | `src/utils/remarkDropLeadingH1.mjs` now demotes later body H1s to H2. |

The new post tags in `Head.astro`:
- `og:image` and `twitter:image`, only when the cover file exists.
- `article:published_time` and `article:tag`.
- `BlogPosting` JSON-LD.

Not done yet: manual ad units (Finding 4), cover-image compression and the 24 broken cover paths (Finding 8), the content triage (Finding 1) and internal links (Finding 10).

## Summary

The technical SEO basics are mostly fine. Posts have canonicals and descriptions, the sitemap is valid, robots.txt allows everything, and old post URLs still resolve. The likely reasons for poor traffic and revenue are, in order:

1. **Content quality at scale.** About 200+ templated "X: A Comprehensive Guide" posts, mostly 500–1,000 words, look like what Google's helpful-content and scaled-content policies demote site-wide.
2. **Duplicate copies of the site.** A full mirror is served at `/astro-tech-blog/`, and 529 posts were cross-posted to Medium with canonical URLs that 404.
3. **Ads that barely render.** Only Auto ads are used, and there are no manual ad units. On a 9,400px post, Auto ads placed one unit, and it went unfilled.
4. **No working analytics.** The site still sends to a Universal Analytics property (`UA-…`), and Universal Analytics stopped processing data in July 2023. There has been no traffic data for over three years.

---

## Findings ranked by likely impact

### 1. Scaled, templated content is probably suppressing the whole site (High)

**Evidence** (from `src/content/docs/posts`, 561 posts):

- 208 posts sit in `tech/2023/`, averaging 604 words. Their titles follow one template: `Android_ButterKnife_View_Binding_Library_A_Comprehensive_Overview`, `C++_Function_Objects_and_Functors_A_Comprehensive_Guide`, `Swift's_Concurrency_Features_A_Deep_Dive`, `Microsoft.AspNetCore.Mvc_An_Overview`, and so on.
- Phrase counts across all posts: "in this article" in 278 posts, "a comprehensive" in 98, "comprehensive guide" in 68, "in conclusion" in 32, "delve" in 23.
- Length: 189 posts are under 500 words, 301 are 500–999 words, and only 71 are over 1,000 words. 49 posts are under 300 words.
- There are near-duplicate series. For example, `tech/go/chapter_1_why_golang.md` through `chapter_5_why_golang.md` all have the title "History of Golang." and share one description. There are 55 posts with a duplicated description and about 10 duplicated titles ("File handling and error handling in Go." ×3, "Introduction to csharp" ×2, "Image manipulation in Rust" ×2, …).
- Many topics are outdated or deprecated libraries (ButterKnife, Picasso, Bintray/JCenter). Many others are generic overviews that compete with official docs. The public search for the Android post returns 17 other sources for the same overview.
- Cover images are generic stock or DALL·E images that are often unrelated to the topic: the Android Architecture Components post shows oil pumpjacks. One image (`/imgs/2023/186810635.png`) is reused on 21 posts.
- Public search still lists these pages, so they are indexed. Being indexed but ranking low is the typical pattern of a site-wide quality demotion, not a crawl problem.

**Why it matters:** Google's helpful-content system (now part of core ranking) and its "scaled content abuse" spam policy (March 2024) work at the site level. A large share of low-value pages can drag down the good posts too, such as the Astro, Dash and three.js write-ups and the original project posts. AdSense also rejects or limits ads on "low value content", and generic programming overviews earn low CPCs anyway.

**Fixes:**
- Triage the posts with Search Console data (clicks and impressions over the last 16 months). Sort them into three groups:
  - **Keep and improve:** posts with impressions, or original work (your own projects, experiments, real code you ran). Add real examples, outputs, screenshots and current versions.
  - **Merge:** near-duplicates such as the five Go "why golang" chapters, the three Go file-handling posts and the C# intro pairs. Redirect the old URLs to the merged post.
  - **Remove or noindex:** zero-impression, generic "Comprehensive Guide" posts on deprecated or commodity topics. Use `<meta name="robots" content="noindex">` through Starlight's `head` frontmatter, or delete the post and let it 404 or 410. GitHub Pages cannot send a 410; a deleted page returns 404, which is fine.
- Stop publishing the templated format. Fewer, longer posts based on things you built will do better.
- Give each post a relevant image, or none, instead of shared stock images.

### 2. The whole site is published twice: the `/astro-tech-blog/` mirror (High)

**Evidence:**
- `.github/workflows/build_app.yml` deploys `dist/` to this repo's `gh-pages` branch. GitHub Pages is enabled for this repo (`gh api repos/FriendlyUser/astro-tech-blog/pages` → `https://friendlyuser.github.io/astro-tech-blog/`, legacy build from `gh-pages`).
- `.github/workflows/github_repo.yml` ("Build Main Site") builds the same site again and force-pushes it to `FriendlyUser/FriendlyUser.github.io` (`master`), which serves the domain root.
- Live checks: `https://friendlyuser.github.io/astro-tech-blog/` → 200 (the homepage), and `/astro-tech-blog/posts/` → 200.
- Public search results include `https://friendlyuser.github.io/astro-tech-blog/` titled "Tech Blog", so Google has indexed the mirror.

The current build puts root canonicals on every page, which limits the damage now. But earlier builds (before the Starlight move) had no canonical tags at all (`src/templates/Base.astro` has none). Google may have indexed both copies for years and split signals between them.

**Fixes:**
- Turn off GitHub Pages for `astro-tech-blog` (repo **Settings → Pages**), or delete the `gh-pages` branch and the `Deploy 🚀` step in `build_app.yml`. If you would rather keep the URLs alive, replace the mirror with a single `index.html` and `404.html` that redirect (meta refresh plus a canonical) to the matching root URL.
- Both workflows also run on every push and on a schedule, building the site twice. Removing one halves CI time.

### 3. 529 Medium cross-posts point their canonical at URLs that 404 (High, if those drafts were published)

**Evidence:**
- `scripts/upload_to_medium.py` sets `canonicalUrl = f"{baseUrl}{data['slug']}"`, where `slug` is the file path, for example `/posts/stonks/ta/natural_gas_ta_with_python.md`.
- `https://friendlyuser.github.io/posts/stonks/ta/natural_gas_ta_with_python.md` returns 404 (live check). Every canonical sent to Medium therefore points at a 404, and the real URL has a trailing slash and no `.md`.
- `scripts/medium_articles.txt` lists 529 posts that were sent. They were created with `publishStatus: "draft"`, so the impact depends on whether you published them on Medium.

**Why it matters:** If the Medium copies are public, Google ignores a canonical that points at a 404 and treats Medium (a much stronger domain) as the original. Medium then ranks for your content and your page is filtered as a duplicate.

**Fixes:**
- Check your Medium account for published copies. For each one, set the canonical link (**Story settings → Advanced → Customize canonical link**) to the real URL: `https://friendlyuser.github.io/posts/…/slug/`.
- Fix the script: `slug = adjustedPost.removesuffix('.md') + '/'`. Its `basePostFolder` also needs updating to `src/content/docs/posts` after the Starlight move.
- Consider stopping the cross-posting, or delaying it by a few weeks so Google indexes your copy first.

### 4. Ads: only Auto ads, and they barely place anything (High for revenue)

**Evidence:**
- The only ad code is the AdSense loader in `astro.config.mjs` (`analyticsHead`). No `data-ad-slot` or `<ins class="adsbygoogle">` unit exists anywhere, and none ever has (`git log -S data-ad-slot` is empty). The Starlight move did not remove any ad slots, because there never were any. The site has always relied on Auto ads.
- Live check on a post (1280×720, scrolled to the bottom, waited about 10s): `adsbygoogle.js` and `show_ads_impl` loaded, and the Google CMP (Funding Choices) loaded with `__tcfapi` present. Only **one** ad element appeared, `ins.adsbygoogle-noablate` with `data-ad-status="unfilled"` and size 0×0 (an anchor/overlay slot). There were **no** in-content Auto ads on a 9,448px-tall article.
  - Caveat: the in-app browser has no ad history or cookies, so fill there is lower than for real visitors. Even so, Auto ads placing zero in-article slots on a long post is a placement problem, not just a fill problem.
- The Starlight layout has a left sidebar, a right TOC and a narrow content column. Auto ads often find few eligible spots in docs-style layouts.
- The homepage (`src/pages/index.astro`) does not load AdSense. That's fine for a portfolio page. `/old_site/` does load it.
- `ads.txt` is correct and served at the root: `google.com, pub-2479144310234386, DIRECT, f08c47fec0942fa0` (200 at `https://friendlyuser.github.io/ads.txt`). It is also listed in the sitemap through `customPages`. That's harmless but unnecessary.
- Consent: a Google-certified CMP (Funding Choices) is active, which is required for EEA, UK and CH ad serving. Check in AdSense **Privacy & messaging** that the GDPR message is published, and add the US state-regulations message.

**Fixes:**
- Add 2–3 manual responsive units to posts: one after the intro (for example after the first `h2`), one mid-article and one before the footer. You can do this through a Starlight component override (for example `MarkdownContent` or the existing `Footer.astro`/`PageTitle.astro` overrides). Reserve space with `min-height` to avoid layout shift.
- In AdSense, turn on Auto ads "in-page" formats and review the ad-load slider for this site. Check whether the site shows any policy issue, "Getting ready", or "Limited ad serving" state.
- Nothing on site performance blocks ads. The loader is async, and CLS measured 0 on the tested post.

### 5. Analytics is dead: Universal Analytics only (High for decision-making)

**Evidence:** `astro.config.mjs` loads `gtag/js?id=UA-119155027-6` and calls `gtag('config', 'UA-119155027-6')`. Universal Analytics properties stopped processing hits on 1 July 2023. The old `Base.astro` also references a GTM container (`GTM-K8P5P8FQ`) only in a `<noscript>` iframe, with no GTM script, so it does nothing.

**Fix:** Create a GA4 property (`G-XXXXXXX`) and replace the UA ID in `analyticsHead`, or link Search Console and use it as the primary traffic source. Without this, you can't tell which posts earn anything.

### 6. Thin tag pages and sitemap noise (Medium)

**Evidence:**
- `dist/sitemap-0.xml` has 946 URLs: 561 posts, about 298 `/tags/*` pages, 47 `/posts/N/` pagination pages, 13 topic pages, `/old_site/`, `/privacy_policy/` and `/ads.txt`.
- About 200 of the 298 tag pages list exactly one post, and about 40 list two. The description reads "1 post tagged X." Tags vary in case and spacing (`/tags/AI/`, `/tags/AI Agents/`, `/tags/windows store/`, …).
- No `<lastmod>` in the sitemap.
- `robots.txt` has no `Sitemap:` line.

**Fixes:**
- Add `noindex` to tag pages with fewer than about 3 posts, or drop tag pages from the sitemap with the `filter` option of `@astrojs/sitemap` and keep the 13 topic pages as the hub pages. Normalise tag case and spelling in frontmatter.
- Add `Sitemap: https://friendlyuser.github.io/sitemap-index.xml` to `public/robots.txt`.
- Add `lastmod` with `serialize()` in the sitemap integration, using `pubDate` or the git date.
- Remove `customPages: [ads.txt]`.

### 7. Missing social and structured-data markup on posts (Medium)

**Evidence** (built post `dist/posts/tech/2023/Android_Architecture_Components_A_Comprehensive_Overview/index.html`):
- Present: `<title>`, `meta description`, canonical, `og:title`, `og:description`, `og:url`, `og:type=article`, and `twitter:card=summary_large_image`.
- Missing:
  - No `og:image` or `twitter:image`. 556 of 561 posts have `imgSrc` in frontmatter, but it is only shown on the page, not emitted as metadata, so `summary_large_image` has no image.
  - No `article:published_time`.
  - No JSON-LD (`BlogPosting` or `Article` with author, datePublished and image).
  - No `BreadcrumbList`.
- The homepage has `og:*` but no `og:image`, and no `Person`/`WebSite` JSON-LD.
- `/old_site/` has no canonical tag and repeats the homepage's role with different text ("Tech Blog | Software Development"). Either canonical it to `/`, add `noindex`, or remove it.
- `/404.html` declares `canonical=/404/`. That's harmless (GitHub Pages returns a real 404 status), but a `noindex` is cleaner.

**Fix:** Add a Starlight `Head` override (or extend `PageTitle.astro`'s data source) that emits `og:image` and `twitter:image` with an absolute URL from `imgSrc`, plus `article:published_time` and a `BlogPosting` JSON-LD block, for pages under `/posts/`.

### 8. Cover images are large, unoptimized and sometimes broken (Medium, Core Web Vitals)

**Evidence:**
- `src/components/starlight/PageTitle.astro` renders `<img class="post-cover" src={post.imgSrc} … fetchpriority="high">` straight from `public/`. That bypasses Astro's image pipeline, so there is no resizing, no WebP/AVIF and no `srcset`.
- Cover sizes: of 268 unique local cover files, the median is 410 KB, 203 are over 300 KB and 10 are over 1 MB. The largest images in `public/` include `imgs/2023/pikachu_nobg.png` (5.8 MB), `imgs/home-page.jpg` (4.0 MB), `imgs/2023/progress.png` (3.9 MB) and `assets/images/github.png` (8.6 MB). `public/imgs` totals 129 MB.
- On the tested post, the 333 KB PNG cover was the largest single transfer, and it is the LCP candidate. On mobile 4G this alone is about 1–2 s.
- Broken covers: 19 `imgSrc` paths point to files that don't exist in `public/` (for example `/imgs/2023/1212575964.png`, `/imgs/2023/2432208319.png`). 5 posts use `unsplash.com/photos/...` page URLs as `imgSrc`; those are HTML pages, not images, so the image is broken.
- Inline post images: 1,179 `<img>` in post bodies, of which 466 have `loading="lazy"`.

**Fixes:**
- Convert covers to WebP or AVIF at about 1200px wide (a one-off `sharp` script). Or move covers to `src/assets` and render them with `astro:assets` `<Image>` / `<Picture>` with `widths` and `sizes`.
- Fix the 19 missing paths and the 5 Unsplash page URLs. Use `images.unsplash.com/...` direct URLs, or download the images.

### 9. Headings and on-page structure (Low–Medium)

**Evidence:**
- 360 posts have a `# ` H1 in the body. `remarkDropLeadingH1` removes only the leading one, so 29 built posts still have more than one `<h1>`.
- 143 built posts have no `<h2>`. They are long walls of text, or their structure was entirely H1-level.
- Titles: 105 are over 60 characters, and many are underscores turned into spaces with the colon lost ("Android Architecture Components A Comprehensive Overview").
- Descriptions: 193 are under 70 characters, 99 are over 160, and many start with "In this article , we will…".

**Fix:** Demote remaining body H1s to H2 (a remark plugin that shifts any later `depth: 1` to 2, or a one-off sed). Rewrite titles and descriptions only for posts you keep under Finding 1.

### 10. Internal linking (Low–Medium)

**Evidence:** 554 of 561 posts have no in-body link to another post. Each post page gets about 14 `/posts/` links from the custom sidebar (same-topic list) and prev/next links. The homepage links to 36 posts.

**Fix:** For the posts you keep, add 2–3 contextual links to related posts. Optionally add a "Related posts" block (same tags) under each article. This also gives manual ad units a natural location.

### 11. Homepage performance (Low)

**Evidence:**
- Live homepage: about 161 KB transferred in total, DCL 540 ms and load 592 ms on desktop. No long tasks were recorded.
- `src/scripts/portfolio/main.ts` dynamically imports `scene.ts` (three.js; `dist/_astro/scene.C0hTFOWs.js` is 626 KB raw, 155 KB gzip) as soon as the page loads, including on phones.
- Text content is server-rendered and readable without JS. The H1 is "Hi, I'm David." and the page has a proper meta description.

**Fix:** This is not a big SEO factor; the homepage is a portfolio, not a landing page for searches. Optional improvements:
- Defer the `import('./scene')` to `requestIdleCallback`, or skip it on `compact` / `saveData` / `prefers-reduced-motion`, to protect mobile INP.
- Add `og:image` and `Person` JSON-LD.

Mermaid (`page.CGRamNim.js`, 6 KB) only loads the large mermaid chunks when a `pre.mermaid` is present, so it does not affect normal posts.

### Checked and fine

- `site: 'https://friendlyuser.github.io'` is set, and canonicals are absolute and correct on posts, `/posts/`, tags and topics.
- `robots.txt`: `User-agent: * / Allow: /`. No `noindex` found in any built page.
- Old post URLs are preserved by `generateId` in `src/content.config.ts`. `/posts/tech/2023/Android_…_Overview` (no slash) returns 301 to the trailing-slash URL. Pre-migration routes (`/posts/…`, `/posts/N/`, `/tags/…`, `/privacy_policy/`, `/old_site/`) all still exist.
  - The lowercase variant of a URL returns 404. That's expected, but any external links that used different casing are broken.
- `ads.txt` is correct, at the root, and served with status 200.
- The 404 page returns a real 404 status.
- CLS on the tested post was 0.

---

## Suggested order of work

1. Turn off the `/astro-tech-blog/` Pages mirror (Finding 2) and switch analytics to GA4 (Finding 5). Each takes a few minutes.
2. Check Medium for published copies and fix their canonicals (Finding 3).
3. Add `og:image`, JSON-LD, `Sitemap:` in robots.txt, `noindex` on thin tag pages and the `/old_site/` canonical (Findings 6 and 7). These are small code changes.
4. Add manual in-article ad units (Finding 4).
5. Compress covers and fix broken cover paths (Finding 8).
6. Run the content triage with Search Console data: prune, merge and improve (Finding 1). This is the largest job, but it is the one most likely to move traffic.

## Data needed from you

- **Search Console:**
  - The Pages / Indexing report: how many URLs are "Crawled – currently not indexed" or "Duplicate, Google chose different canonical"? Are `/astro-tech-blog/` URLs or Medium URLs chosen as canonical?
  - The Performance report (16 months), exported per page, to drive the content triage.
  - Any Manual actions entry.
- **AdSense:**
  - Site status (Ready / Getting ready / Needs attention).
  - Any policy center issues ("low value content").
  - Auto ads settings for the site, and impressions and RPM over time, to see whether the drop lines up with a Google core or helpful-content update (for example September 2023 or March 2024).
- **Medium:** whether the 529 drafts were published.

## Sources checked

- Repo: `astro.config.mjs`, `src/content.config.ts`, `src/components/starlight/PageTitle.astro`, `src/scripts/portfolio/main.ts`, `src/templates/Base.astro`, `public/robots.txt`, `public/ads.txt`, `.github/workflows/build_app.yml`, `.github/workflows/github_repo.yml`, `.github/workflows/publish_medium.yml`, `scripts/upload_to_medium.py`, `scripts/medium_articles.txt`.
- Build: `dist/sitemap-0.xml` and `dist/**/index.html` (meta tags, headings, links, image tags).
- Live:
  - `curl` status checks of `/robots.txt`, `/ads.txt`, `/sitemap-index.xml`, post URLs (with and without trailing slash, lowercase), `/astro-tech-blog/`, and a `.md` canonical.
  - Browser checks of a post (ad requests, ad slots, CMP, CLS, transfer sizes) and the homepage (JS weight, timings).
- Search: `site:friendlyuser.github.io` results include the mirror URL (https://friendlyuser.github.io/astro-tech-blog/) and old-format titles ("… - FriendlyUsers Tech Blog"). A search for the Android post's title shows it competing with many near-identical overviews.
