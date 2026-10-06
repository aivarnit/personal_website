# Anthony Varnit — developer portfolio

A responsive static portfolio with no build step built with semantic HTML, CSS, and JavaScript modules. Inter and JetBrains Mono are self-hosted in WOFF2 format with their open-source licenses; no external font service is used. The existing static GitHub Pages hosting and custom domain are supported without a build step.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://localhost:8000**. Use a local HTTP server rather than opening `index.html` directly; the browser loads JavaScript modules over HTTP.

## Edit portfolio content

- **`js/data.js` → `profile`**: GitHub URL, LinkedIn URL, email address, resume path, portrait path, accessible alt text, and caption. Null social/contact values display a coming-soon notice. Resume actions open the shared in-site viewer, using `assets/resume_general.pdf` today. Change `profile.resume` to replace that document; a null or unavailable local file displays a placeholder. Downloading is a secondary action in the viewer's bottom-right corner.
- **`js/data.js` → `biography`, `education`, `career`, `experience`, `certifications`, `skills`**: edit the hero/About narrative, education, employer progression, roles, credentials, and grouped technologies. These sections are populated from `assets/resume_general.pdf`, including Fordham graduation in May 2023, three Thrive NextGen roles, and four certifications. Certification dates and expiry status were not supplied and are omitted.
- **`js/data.js` → `projects`**: Color-Track, N-Queens Solver, and On-Premise LLM Inference Server contain resume-supported descriptions, dates, stacks, implementation, and outcomes. Monty Hall Simulator, Ollama / Open WebUI, and Docker Homelab remain explicitly marked drafts because the resume does not document those projects. Confirm their descriptions and stacks, replace conceptual artwork with real screenshots, add repository/demo URLs, and supply personal challenge reflections. Copy a project entry to add another, including a Hermes Agent project. Use a unique `id` and `gallery: 'software'` or `'infrastructure'`.
- **`index.html`**: edit page structure, contact copy, and metadata. Hero/About and education content are rendered from `js/data.js`. Central TODO comments in that file identify missing media, links, unsupported project details, and personal reflections.
- **`assets/`**: replace the project concept visuals with real screenshots as they become available. The portrait now uses your supplied JPEG; its path and caption are configured in `profile`. The project SVGs are original illustrations, not actual screenshots. Keep the corresponding paths and alt text in `data.js` in sync.
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

MP4 and WebM use the native video player. Videos load metadata only, do not autoplay, and support optional WebVTT captions. YouTube uses the privacy-enhanced embed domain. Closing the dialog removes media to stop playback. Use captions/transcripts for meaningful audio and avoid flashing animation. Color-Track includes a dedicated demonstration placeholder; its description is verified against the resume.

## Structure

```text
index.html          Semantic page structure and metadata
css/styles.css      Layout, typography, responsive rules, reduced motion
js/data.js          Profile, biography, education, career, skills, and projects
js/app.js           Reusable renderers, media, and navigation behavior
js/modal.js         Shared overlay lifecycle, focus, dismissal, and cleanup
js/resume.js        PDF page rendering, zoom, resizing, and placeholder states
js/vendor/          Pinned, self-hosted PDF.js renderer, worker, and license
js/motion.js        Individual scroll reveals and motion preference handling
js/background.js    Smoothed ambient pointer light with idle/touch fallbacks
css/motion.css      Hero, reveal, hover, and timeline animations
assets/             Organized local placeholders and favicon
CNAME               Existing custom domain
```

The navigation starts as a distinct hero strip and stays at the top while scrolling. It changes subtly after the hero and highlights the current section. On mobile it becomes an expandable menu. Project, resume, and notice dialogs share one modal controller for Tab cycling, Escape, backdrop dismissal, immediate closing, and focus restoration. Resume previews use locally hosted [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) 5.4.296, loaded only when Resume opens. It renders the actual PDF pages at the viewer width, offers zoom and fit controls, and supplies equivalent text for screen readers. The preview is a keyboard-scrollable region, so Escape still closes the dialog after interacting with the document. An open-file link provides full PDF access in a separate tab. All animations respect reduced-motion preferences, including changes made while the page is open.

## Content provenance and remaining information

The source reviewed is `assets/resume_general.pdf`. It supports the hero/About narrative, education, employer progression, certifications, skills, and three projects. Existing supplied contact/profile links remain configured. No repository/demo URLs, real project screenshots, certification dates, benchmark metrics, or personal challenge reflections were inferred. Monty Hall, Open WebUI, a separate Docker Homelab, and Hermes Agent details still need your confirmation. Project artwork remains labeled conceptual and missing media remains a placeholder.

Deployment is the same as the original static repository; no npm install or production build is required.

## Ambient background and modal interaction

A faint dot pattern and low-opacity grayscale radial illumination add depth. Desktop pointer movement updates CSS variables through a smoothed, on-demand animation loop that stops after settling. Touch, reduced motion, and hidden tabs disable tracking and use the static treatment.

Project, resume, and notice dialogs open and close immediately, including their backdrops. All content appears together with no fades, staggered reveals, scale transitions, or shared-thumbnail animation. Reduced-motion users receive the same instant interaction. The modal controller preserves keyboard activation, Tab/Shift+Tab cycling, Escape, backdrop dismissal, and focus return. Closing pauses and resets native video, stops embeds, and synchronously cleans up content so projects can be reopened rapidly.

Project cards use static hover styling and the existing keyboard focus outline. They have no scroll reveal, focus-driven highlight, transform transition, or persistent press state, so returning focus from a modal cannot restart an animation on the previous card. Hover styling is inactive while a modal is open.

A first video or YouTube media entry occupies the existing cover slot, with `project.image` providing the video poster; other media entries remain below the project description. Stable scrollbar space prevents underlying cards from shifting when scroll is locked.

## Validation

This static site has no production build command. Modal interaction checks cover immediate content/backdrop visibility and dismissal, rapid reopening and project succession, keyboard activation, focus trapping and return, reduced motion, responsive bounds, and playback cleanup. Resume preview rendering is checked alongside the shared modal controller. Git whitespace checks also pass.
