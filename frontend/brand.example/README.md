# Custom branding

Copy this folder to `frontend/brand.local/` and edit it. `brand.local/` is git-ignored, so an
organisation's name, logo and colours stay out of the public repository; the build picks it up
automatically (dev server, `npm run build`, and the Docker image, which copies `frontend/`).

Every file is optional. Anything left out falls back to the defaults in `src/brand/` and
`src/styles/tokens.css`.

| File | Purpose |
|---|---|
| `brand.json` | Browser tab title, and per language any UI strings to override: a subset of `src/i18n/{en,ar}.json`, usually `app.title`, `app.name_en`, `app.name_ar`, `app.subtitle` |
| `brand.css` | `--brand-*` colour tokens (see `src/styles/tokens.css` for the full list) |
| `symbol.svg` or `symbol.png` | Logo in the header and the nav rail (square) |
| `favicon.png`, `favicon.svg` or `favicon.ico` | Browser tab icon; defaults to the symbol |

In the header, `name_ar` is drawn above `name_en` as a two-line wordmark. Leave `name_ar` empty
for a single-line name.

Restart the dev server after adding or removing a file here.
