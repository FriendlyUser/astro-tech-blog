---
tags: ['php', 'wordpress']
title: "Building a custom WordPress theme: files, the Loop, and publishing"
description: Notes from building a rough Tailwind-styled WordPress theme, covering the theme files, a post-card Loop, its bugs, and where to publish it.
pubDate: Fri, 7 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1444932837.png
---
WordPress is an open-source CMS written in PHP that stores content in MySQL (or MariaDB). A theme controls how that content is rendered. These are my notes from building a fairly rough custom theme, [bluey-wordpress-theme](https://github.com/FriendlyUser/bluey-wordpress-theme), styled with Tailwind CSS.

## Classic themes vs. block themes

The theme in this post is a **classic theme**: PHP template files that WordPress picks using the [template hierarchy](https://developer.wordpress.org/themes/basics/template-hierarchy/). Since WordPress 5.9, WordPress also supports **block themes**, which use HTML templates and a `theme.json` file and are edited in the Site Editor. Classic themes still work. If you're starting a new theme today, read the [block theme docs](https://developer.wordpress.org/themes/getting-started/what-is-a-theme/) first.

## Files in a classic theme

Only two files are required: `style.css` and `index.php`. The rest are optional, and WordPress falls back to `index.php` when a more specific template is missing.

- `style.css`: the header comment holds the theme metadata (Theme Name, Author, Version, Text Domain, and so on).
- `index.php`: the fallback template for every request.
- `header.php` / `footer.php` / `sidebar.php`: shared parts, loaded with `get_header()`, `get_footer()` and `get_sidebar()`.
- `functions.php`: registers menus, widget areas, theme supports (such as `post-thumbnails`), and enqueues scripts and styles.
- `single.php`, `page.php`, `archive.php`: templates for single posts, pages and archive listings.
- `template-parts/`: reusable chunks loaded with `get_template_part()`.

## The workflow

1. Run WordPress locally (Docker Compose with the official `wordpress` and `mysql` images works well) and create a folder under `wp-content/themes/`.
2. Add `style.css` and `index.php`, then activate the theme in **Appearance → Themes**.
3. Add `header.php`, `footer.php`, `functions.php`, and the specific templates as you need them. Use template tags (`the_title()`, `the_content()`, `the_permalink()`) to output post data.
4. Turn on `WP_DEBUG` in `wp-config.php` while developing so PHP notices and deprecations show up.
5. Test on a few screen sizes and with real content: long titles, posts without featured images, posts with no comments.

## The post-card Loop

This is the Loop from my theme's listing template. It renders each post as a Tailwind card with the featured image, title, excerpt, author, date, an edit link, and a comment link. Some of the translation strings still use the `html5blank` text domain.

```php
<?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>

	<div id="post-<?php the_ID(); ?>" class="inline-block max-w-sm rounded overflow-hidden shadow-lg">
		<?php if ( has_post_thumbnail() ) : ?>
			<a href="<?php the_permalink(); ?>" title="<?php the_title_attribute(); ?>">
				<img class="w-full" src="<?php the_post_thumbnail_url(); ?>" alt="<?php the_title_attribute(); ?>">
			</a>
		<?php endif; ?>

		<div class="px-6 py-4">
			<div class="font-bold text-xl mb-2"><?php the_title(); ?></div>
			<div class="text-gray-700 text-base">
				<?php the_excerpt(); ?>
			</div>
		</div>

		<div class="px-6 py-4">
			<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
				<?php _e( 'Published by', 'html5blank' ); ?> <?php the_author_posts_link(); ?>
			</span>
			<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
				<?php the_time( 'F j, Y g:i a' ); ?>
			</span>
			<?php
			edit_post_link(
				__( 'Edit', 'html5blank' ),
				'<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">',
				'</span>'
			);
			?>
			<?php if ( comments_open() ) : ?>
				<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
					<?php comments_popup_link( __( 'Leave your thoughts', 'html5blank' ), __( '1 Comment', 'html5blank' ), __( '% Comments', 'html5blank' ) ); ?>
				</span>
			<?php endif; ?>
		</div>
	</div>

<?php endwhile; else : ?>

	<article>
		<h2><?php _e( 'Sorry, nothing to display.', 'html5blank' ); ?></h2>
	</article>

<?php endif; ?>
```

`have_posts()` / `the_post()` iterate over the main query and set up the global post, so template tags like `the_title()` and `the_ID()` refer to the current post. If the query is empty, the `else` branch prints a translatable "nothing to display" message.

### What changed from the first version

- **Unescaped titles in attributes.** The first version put `the_title()` inside `title="…"` and `alt="…"`. A title containing a quote breaks the markup. `the_title_attribute()` escapes the value for use in an attribute.
- **`<p>` around `the_excerpt()`.** `the_excerpt()` already wraps its output in `<p>`, so the extra `<p>` produced invalid nested paragraphs. A `<div>` avoids that.
- **Empty edit pill.** `edit_post_link()` prints nothing for visitors who can't edit the post, but the surrounding `<span>` still rendered as an empty grey pill. Passing the `<span>` as the `$before` / `$after` arguments means it only appears when the link does.
- **Hidden comment link.** The original added a `hidden` class when the post had zero comments, which meant the "Leave your thoughts" text could never be seen. Wrapping the pill in `comments_open()` shows it whenever comments are allowed.
- **Stray markup.** Three `<br />` tags inside the Loop added spacing per card. That belongs in CSS (Tailwind margin classes).

## Publishing a theme

- **WordPress.org Theme Directory**: free themes only. Themes must be GPL-compatible and pass a manual review against the [theme requirements](https://make.wordpress.org/themes/handbook/review/required/). The text domain must match the theme slug, so a theme that still uses another starter theme's text domain (like `html5blank` above) will be flagged. Run the [Theme Check](https://wordpress.org/plugins/theme-check/) plugin before submitting.
- **Marketplaces** such as ThemeForest: paid themes, with their own review and a commission on sales.
- **Your own site or GitHub**: zip the theme folder so users can upload it through **Appearance → Themes → Add New Theme → Upload Theme**. GitHub also lets others file issues and send pull requests.

## References

- https://developer.wordpress.org/themes/getting-started/what-is-a-theme/
- https://github.com/FriendlyUser/bluey-wordpress-theme
