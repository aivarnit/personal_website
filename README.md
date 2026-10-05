# Anthony Varnit — developer portfolio

A responsive, dependency-free portfolio built with semantic HTML, CSS, and JavaScript modules. Inter and JetBrains Mono are self-hosted in WOFF2 format with their open-source licenses; no external font service is used. The existing static GitHub Pages hosting and custom domain are supported without a build step.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://localhost:8000**. Use a local HTTP server rather than opening `index.html` directly; the browser loads JavaScript modules over HTTP.

## Replace the placeholders

- **`js/data.js` → `profile`**: GitHub URL, LinkedIn URL, email address, resume path, portrait path, accessible alt text, and caption. Null contact values display a coming-soon notice. Add your PDF as `assets/resume.pdf`, then set `resume: 'assets/resume.pdf'`.
- **`js/data.js` → `experience`, `certifications`, `skills`**: replace employers, dates, role descriptions, accomplishments, credential status, and the initial technology list. Nothing in the draft should be read as a verified credential or result.
- **`js/data.js` → `projects`**: confirm descriptions and stacks, replace conceptual artwork with real screenshots, add repository/demo URLs, and fill in goal, implementation, challenges, and outcome. Copy a project entry to add another, including a Hermes Agent project. Use a unique `id` and `gallery: 'software'` or `'infrastructure'`.
- **`index.html`**: edit About copy, Fordham education details, hero copy, contact copy, and page metadata. Remove the visible placeholder notes once the content is ready.
- **`assets/`**: replace the abstract portrait and six concept visuals. These are original local SVG illustrations, not actual screenshots or a photograph. Keep the corresponding paths and alt text in `data.js` in sync.
- **Social sharing**: replace the SVG `og:image` placeholder with an absolute URL to a 1200 × 630 PNG or JPEG, which is more widely supported by social platforms. Customize `assets/favicon.svg` as needed.

## Project media

Add any number of media entries to a project's `media` array. No card or modal changes are needed:

```js
media: [
  { type: 'image', src: 'assets/projects/screenshot.webp', alt: 'Describe what the screenshot shows', caption: 'Application interface' },
  { type: 'video', src: 'assets/projects/demo.mp4', poster: 'assets/projects/poster.webp', title: 'TurtleBot target tracking', captions: 'assets/projects/demo.vtt', caption: 'Color detection and movement demonstration' },
  { type: 'gif', src: 'assets/projects/demo.gif', alt: 'Describe the animation', caption: 'Short demonstration' },
  { type: 'youtube', videoId: 'VIDEO_ID_11', title: 'Project demonstration', caption: 'Demonstration video' },
]
```

MP4 and WebM use the native video player. Videos load metadata only, do not autoplay, and support optional WebVTT captions. YouTube uses the privacy-enhanced embed domain. Closing the dialog removes media to stop playback. Use captions/transcripts for meaningful audio and avoid flashing animation. Draft Color-Track includes a dedicated demonstration placeholder.

## Structure

```text
index.html          Semantic page, education, and editable narrative copy
css/styles.css      Layout, typography, responsive rules, reduced motion
js/data.js          Profile, experience, credentials, skills, and project data
js/app.js           Reusable renderers, media, dialogs, and navigation behavior
assets/             Organized local placeholders and favicon
CNAME               Existing custom domain
```

The navigation starts as a distinct hero strip and stays at the top while scrolling. It changes subtly after the hero and highlights the current section. On mobile it becomes an expandable menu. Native modal dialogs handle focus containment, Escape, and return focus to their trigger. All animations respect reduced-motion preferences.

## Before publishing

Replace all labeled draft information and configure contact URLs and the resume. Verify that every claimed skill, credential, responsibility, and project result matches your experience. Deployment is the same as the original static repository; no npm install or build is required.

## Validation

Checked in Chromium at 375, 430, 768, 1024, 1440, and 1920 pixels: no horizontal overflow, expected one/two/three project columns, all six project dialogs, mobile menu, focus cycling, Escape, focus restoration, resume placeholder, reduced motion, sticky navigation, loaded visible images, and no page or console errors. JavaScript syntax and Git whitespace checks also pass.
