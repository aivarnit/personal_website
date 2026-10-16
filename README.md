# Anthony Varnit — developer portfolio

A responsive static portfolio with no build step built with semantic HTML, CSS, and JavaScript modules. Inter and JetBrains Mono are self-hosted in WOFF2 format with their open-source licenses; no external font service is used. The existing static GitHub Pages hosting and custom domain are supported without a build step.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://localhost:8000**. Use a local HTTP server rather than opening `index.html` directly; the browser loads JavaScript modules over HTTP.

This serves the static portfolio. The Color-Track live viewer also needs its ROS Compose services; use the stack below to run the complete demo.

## Edit portfolio content

- **`js/data.js` → `profile`**: GitHub URL, LinkedIn URL, email address, resume path, portrait path, accessible alt text, and caption. Null social/contact values display a coming-soon notice. Resume actions open the shared in-site viewer, using `assets/resume_general.pdf` today. Change `profile.resume` to replace that document; a null or unavailable local file displays a placeholder. Downloading is a secondary action in the viewer's bottom-right corner.
- **`js/data.js` → `biography`, `education`, `career`, `experience`, `certifications`, `skills`**: edit the hero/About narrative, education, employer progression, roles, credentials, and grouped technologies. These sections are populated from `assets/resume_general.pdf`, including Fordham graduation in May 2023, three Thrive NextGen roles, and four certifications. Certification dates and expiry status were not supplied and are omitted.
- **`js/data.js` → `projects`**: Color-Track, N-Queens Solver, and On-Premise LLM Inference Server contain resume-supported descriptions, dates, stacks, implementation, and outcomes. Monty Hall Simulator, Ollama / Open WebUI, and Docker Homelab remain explicitly marked drafts because the resume does not document those projects. Confirm their descriptions and stacks, replace conceptual artwork with real screenshots, and supply personal challenge reflections. Copy a project entry to add another, including a Hermes Agent project. Use a unique `id` and `gallery: 'software'` or `'infrastructure'`.
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

MP4 and WebM use the native video player. Videos load metadata only, do not autoplay, and support optional WebVTT captions. YouTube uses the privacy-enhanced embed domain. Closing the dialog removes media to stop playback. Use captions/transcripts for meaningful audio and avoid flashing animation. Color-Track uses the live ROS viewer in `js/project-demo-player.js`; runtime topic contracts and source facts live in `js/color-track-demo.js`.

## Live Color-Track ROS demo

Color-Track is an interactive frontend to a single isolated ROS 1 session. The `color-track-runtime/` Compose stack runs ROS Noetic, the repository's original `CTrack.py` and `OANode.py`, a small sensor simulator, rosbridge and a read-only topic proxy. The simulator publishes raw BGR camera frames, `LaserScan`, and `Odometry`. The original `CTrack.py` consumes those frames, runs its own OpenCV mask and image-moment logic, and publishes `/safe_cmd_vel`. The original `OANode.py` consumes that command and scan, then publishes `/cmd_vel`; the simulator applies those ROS commands to its robot pose and renders the next camera frame. It also watches `/safe_cmd_vel` so the original node's explicit zero command stops motion immediately.

The simulator target pixel is inside the source's configured BGR orange range (`(0, 30, 75)` to `(5, 50, 89)`). The simulator does not calculate target centroid or choose tracking velocities. `CTrack.py` makes those decisions. The wrapper only disables the source's two OpenCV GUI windows in the headless container; image conversion, thresholding, moments, steering, goal threshold and velocity publication remain in the repository code. The container records the upstream Git revision in `/opt/color-track/UPSTREAM_REVISION`; set `COLOR_TRACK_REF` to a branch, tag, or commit before building to select a source revision.

Gazebo is not included: this deterministic 2D environment needs only camera projection, pose integration, scan data, and command feedback. A full TurtleBot/Gazebo installation would add image size and graphics requirements without exercising additional Color-Track logic for this obstacle-free example.

ROS Noetic is the direct ROS 1 / `rospy` environment required by these scripts; the repository has no catkin package manifest, so the runtime invokes the source files with Python. Noetic reached end of life on May 31, 2025, so this demo is isolated in containers and should be treated as a legacy compatibility environment. See the [ROS project's end-of-life notice](https://discourse.ros.org/t/ros-noetic-end-of-life-may-31-2025/43160).

Run the full local stack:

```sh
cd color-track-runtime
docker compose up --build -d
```

Open **http://localhost:8080**, open Color-Track, and press **Start Demo**. Start launches the simulator and both original ROS nodes. Pause freezes the simulated robot and stops the motion nodes; Resume continues from the current pose. Reset starts fresh processes and returns the robot and trajectory to the deterministic initial pose. Closing the project dialog stops the single session. The API shuts down an unattended session after `IDLE_TIMEOUT_SECONDS` (default 600 seconds).

Verify the closed loop and the browser-facing rosbridge topic filter after Compose is up:

```sh
docker compose exec -T runtime python3 /opt/demo/verify_runtime.py
```

The verifier starts the session, subscribes through the same allowlisted WebSocket proxy as the browser, waits for the original `CTrack.py` to report `target found`, and checks live camera, scan, odometry, `/safe_cmd_vel`, `/cmd_vel`, robot travel and all six browser-visible ROS topics. Useful individual checks:

```sh
docker compose exec -T runtime rostopic echo -n 1 /camera/rgb/image_raw/header
docker compose exec -T runtime rostopic echo -n 1 /scan/header
docker compose exec -T runtime rostopic echo -n 1 /odom/header
docker compose exec -T runtime rostopic echo -n 1 /safe_cmd_vel
docker compose exec -T runtime rostopic echo -n 1 /cmd_vel
docker compose logs -f runtime rosbridge bridge-filter
```

The browser receives JPEG-compressed representations of the same raw camera frames through rosbridge, plus real odometry, scan, both velocity topics, and simulation state. The top-down path is drawn from `/odom`; velocities and topic activity are from incoming ROS messages; the console is populated from actual node output.

Only the gateway port is published, bound to loopback for local use. The ROS master and rosbridge remain on a private Compose network. The WebSocket proxy allows subscriptions to the six demo topics and rejects every other rosbridge operation, including publishing, service calls, and subscriptions outside the allowlist. The REST API exposes only Start, Pause, Reset, Stop and heartbeat, runs one fixed session, and applies a control rate limit. Containers are unprivileged, have memory, CPU and process limits, and use read-only roots where practical.

Before any public deployment, run the ROS containers on a private container host behind a TLS reverse proxy, set `COLOR_TRACK_API_URL`, `COLOR_TRACK_ROSBRIDGE_URL` and `ALLOWED_WEB_ORIGINS` for that deployment, and add authenticated or signed per-session access, public abuse controls, and an explicit concurrency/queue policy. The current runtime intentionally supports one demo session, and the local Compose configuration is not an internet-facing deployment. Do not publish port 9090 or the ROS master. The closed loop has not been executed on this checkout unless the verification command completes successfully.

Useful local settings can be supplied in `color-track-runtime/.env`:

```dotenv
PORT=8080
COLOR_TRACK_REF=main
ALLOWED_WEB_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
COLOR_TRACK_API_URL=/api/color-track
COLOR_TRACK_ROSBRIDGE_URL=ws://localhost:8080/rosbridge
IDLE_TIMEOUT_SECONDS=600
```

## Structure

```text
index.html          Semantic page structure and metadata
css/styles.css      Layout, typography, responsive rules, reduced motion
js/data.js          Profile, biography, education, career, skills, and projects
js/app.js           Reusable renderers, media, and navigation behavior
js/project-demo-player.js Live Color-Track ROS viewer and controls
js/color-track-demo.js    Color-Track topic contracts and source facts
js/color-track-runtime-config.js Runtime API and WebSocket endpoint config
color-track-runtime/      Noetic Compose stack, simulator, API and bridge filter
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

The source reviewed for portfolio content is `assets/resume_general.pdf`. The Color-Track runtime is built from [aivarnit/color-track](https://github.com/aivarnit/color-track), specifically its `README.md`, `CTrack.py`, and `OANode.py`. The project card illustration remains conceptual until replaced with a real project screenshot.

Deployment is the same as the original static repository; no npm install or production build is required.

## Ambient background and modal interaction

A faint dot pattern and low-opacity grayscale radial illumination add depth. Desktop pointer movement updates CSS variables through a smoothed, on-demand animation loop that stops after settling. Touch, reduced motion, and hidden tabs disable tracking and use the static treatment.

Project, resume, and notice dialogs open and close immediately, including their backdrops. All content appears together with no fades, staggered reveals, scale transitions, or shared-thumbnail animation. Reduced-motion users receive the same instant interaction. The modal controller preserves keyboard activation, Tab/Shift+Tab cycling, Escape, backdrop dismissal, and focus return. Closing pauses and resets native video, stops embeds, and synchronously cleans up content so projects can be reopened rapidly.

Project cards use static hover styling and the existing keyboard focus outline. They have no scroll reveal, focus-driven highlight, transform transition, or persistent press state, so returning focus from a modal cannot restart an animation on the previous card. Hover styling is inactive while a modal is open.

A first video or YouTube media entry occupies the existing cover slot, with `project.image` providing the video poster; other media entries remain below the project description. Color-Track has a dedicated live ROS viewer with session controls and topic telemetry. Stable scrollbar space prevents underlying cards from shifting when scroll is locked.

## Validation

This static site has no production build command. Use a local HTTP server for browser interaction because JavaScript modules load over HTTP. Git whitespace checks are available with `git diff --check`.
