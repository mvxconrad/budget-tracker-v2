# Public assets

Files here are served at the site root (e.g. `public/quarterbyte_icon.png` is
available at `/quarterbyte_icon.png`).

| File | Used for |
|------|----------|
| `quarterbyte_icon.png` | The square donut "Q" mark, used in-app (landing, auth, sidebar) and as the favicon. Transparent background. |
| `quarterbyte_wordmark.png` | The full word lockup, used as the social/Open Graph preview image (dark background is fine there). |
| `robots.txt` | Crawler policy; points to the sitemap, keeps crawlers off `/api/`. |
| `sitemap.xml` | Single-page sitemap for search engines. |

## Changing the logo

Replace `quarterbyte_icon.png` with your own square, transparent PNG (same
filename). It drives the mark everywhere via `src/Logo.jsx`. The in-app wordmark
pairs that mark with the word "Quarterbyte" rendered in the UI font, so the
wordmark PNG is only used for social link previews.
