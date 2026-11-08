/**
 * Ad and analytics IDs shared by astro.config.mjs (Starlight pages), the homepage and
 * the classic site template.
 *
 * GA4_ID: the Google Analytics 4 measurement ID ("G-XXXXXXXXXX"). Leave it empty to
 * load no analytics. The old Universal Analytics property (UA-119155027-6) stopped
 * collecting data in July 2023, so it is no longer loaded.
 */
export const GA4_ID = '';

export const ADSENSE_CLIENT = 'ca-pub-2479144310234386';

/** Inline gtag bootstrap for GA4_ID (only used when GA4_ID is set). */
export const gtagInit = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA4_ID}');`;
