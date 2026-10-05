# PDF.js vendor files

Pinned version: **5.4.296**, distributed by the Mozilla PDF.js project under Apache 2.0.

- [Official release](https://github.com/mozilla/pdf.js/releases/tag/v5.4.296)
- Source package: `pdfjs-dist@5.4.296`
- `pdf.min.mjs` and `pdf.worker.min.mjs` are unchanged upstream minified browser distributions, obtained from `cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/`.
- `standard_fonts/` contains the unmodified fallback fonts and their license notices from the same npm package.
- License: `PDFJS-LICENSE.txt` (upstream `LICENSE`).

The renderer is imported dynamically by `resume.js`; its worker starts only when the resume is opened. Both are served from this repository. No runtime CDN requests, npm installation, or bundler is needed. Keep the renderer and worker versions identical when updating. These files exist to render PDF pages within the site's keyboard-accessible overlay; no animation library is used.
