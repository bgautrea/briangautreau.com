# briangautreau.com — Design Spec

- **Date:** 2026-04-25
- **Status:** Draft, pending user review
- **Author:** Brian Gautreau (brainstormed with Claude)

## Summary

A multi-page personal site for Brian Gautreau, hosted at `briangautreau.com`. The site reads as a polished CV but functions as a personal landing page: home, full résumé, side-projects index, notes/writing, contact. Built as a static Astro site, packaged into an `nginx:alpine` container, deployed to an existing DigitalOcean k8s cluster behind the cluster's `nginx.org/ingress-controller`. TLS is handled by an upstream nginx proxy, so the in-cluster Ingress is HTTP only.

The visual direction is "Editorial Restraint": warm cream surface, Fraunces serif display, Inter sans body, JetBrains Mono for the rare technical moment, a single sienna accent under 10% of surface. Color is OKLCH, all neutrals tinted toward the warm hue.

## Goals

- A site that conveys 29 years of seniority without feeling stiff or corporate.
- Equal room for the CV, the builder identity (side projects, this site itself), and the investor identity, without the personal stuff feeling tacked on.
- Production-grade craft: tokens, typography, motion, accessibility, performance.
- Trivial to evolve: add a new note by dropping a Markdown file; add a CV entry by appending to a typed array.
- Clean container + manifest story that fits the existing cluster conventions.

## Non-goals (v1)

- No CMS, no database, no auth.
- No analytics in v1 (can be added later).
- No comments, no email signup, no search.
- No GitOps controller (ArgoCD/Flux). Manual `kubectl apply` matches existing workflow.
- No automatic deploy from CI. CI builds and pushes the image only; the user runs `kubectl apply` (or a `kustomize edit set image` + apply).
- No cert-manager. TLS is upstream.
- No internationalization.

## Architecture

```
GoDaddy DNS
     │
     ▼
external nginx (TLS termination, lives outside the cluster)
     │  HTTP
     ▼
DigitalOcean k8s cluster (do-nyc1-k8s1)
     │
     ▼
Ingress (default/nginx-ingress, ingressClassName: nginx, host: briangautreau.com)
  annotations:
    ingress.kubernetes.io/ssl-redirect: "False"
  no tls: block (upstream handles it)
     │
     ▼
Service: briangautreau-com-svc (ClusterIP, port 80 → 8080)
     │
     ▼
Deployment: briangautreau-com (2 replicas, RollingUpdate)
     └── container: nginx:1.27-alpine
         ├── /usr/share/nginx/html ← built Astro dist/
         └── /etc/nginx/conf.d/default.conf ← gzip, cache headers, 404
         image: docker.io/bgautrea/briangautreau-com:<git-sha>
```

### Cluster context (verified 2026-04-25)

- Cluster: `do-nyc1-k8s1` on DigitalOcean, NYC1, k8s 1.32.10, 2 nodes, containerd.
- Kubeconfig: `~/.kube/config.do`.
- Ingress controller: NGINX Inc's `nginx.org/ingress-controller` (NOT community ingress-nginx). Different annotation namespace.
- Existing Ingress `default/nginx-ingress` already routes `briangautreau.com` to a placeholder `nginx-svc` → `nginx` Deployment created the same day. Both will be replaced.
- Other workloads in `default`: `acft`, `devubuntu`, `duckquacker`, `myapp`. Naming uses kebab-case; new resources match.
- Storage classes available (not used in v1: site is stateless).

### Deploy mechanics

1. New Deployment + Service applied first.
2. Existing Ingress (`default/nginx-ingress`) is patched: backend service updated to `briangautreau-com-svc`, hostname / class / `ssl-redirect` annotation unchanged, `tls:` block removed.
3. Once the new pods are healthy and the Ingress is repointed, the placeholder `nginx` Deployment and `nginx-svc` are deleted.
4. Manifests live in `k8s/` as plain YAML plus a `kustomization.yaml`. CI runs `kustomize edit set image briangautreau-com=docker.io/bgautrea/briangautreau-com:<sha>` to bump the tag in a deployable bundle, but does not apply.

## Page IA & content model

### Routes

```
src/pages/
├── index.astro              →  /              home: short hero (no photo) + 4 cards into the rest of the site
├── cv.astro                 →  /cv            full résumé, downloadable PDF link, no photo
├── about.astro              →  /about         narrative + headshot + life outside work
├── building.astro           →  /building      side-projects index
├── notes/
│   ├── index.astro          →  /notes         writing index, reverse-chronological
│   └── [...slug].astro      →  /notes/<slug>  one note rendered from Markdown
├── contact.astro            →  /contact       email, LinkedIn, GitHub, etc.
└── 404.astro                →  /404           custom not-found
```

### `/about` page structure

The page that holds Brian's whole non-work identity. Reads as a short personal essay, not a list of hobbies.

- **Intro block** — headshot on the right, 3-5 sentence narrative paragraph on the left. Sets the throughline: why infrastructure work, why Cedar Park, what kind of person.
- **Outside work** — short prose blocks, each with an eyebrow label + 2-3 sentences:
  - **Endurance** — running, triathlon
  - **The aquarium** — fish keeping
  - **The print bed** — 3D printing
  - **The markets** — investing (folds in here, low-key)
  - **The keyboard** — building software with AI tooling (cross-references `/building`)
- **Cedar Park** — optional one-line place note at the end.

Implemented as a single `about.astro` file. Content lives inline (Astro markup with Markdown-friendly prose) rather than in a content collection — there is exactly one of this page and the structure is bespoke.

### Content model — typed, file-system driven, build-time validated

Astro content collections with Zod schemas. Bad frontmatter or bad TS data fails the build, never reaches production.

- `src/content/cv/work.ts` — `{ company, title, location, start, end?, summary, highlights[] }[]`
- `src/content/cv/patents.ts` — `{ number, title, issued, url? }[]`
- `src/content/cv/publications.ts` — `{ title, publisher, year, url? }[]`
- `src/content/cv/education.ts` — `{ school, degree, years }[]`
- `src/content/projects/*.md` — one file per project; frontmatter `{ title, blurb, status, repo?, url?, stack[] }`; freeform Markdown body.
- `src/content/notes/*.md` — one file per note; frontmatter `{ title, date, summary, draft? }`; freeform Markdown body. Drafts excluded from production builds.

### Shared components (`src/components/`)

- `Layout.astro` — page chrome, head, fonts, OG meta, view-transitions root.
- `Header.astro` — wordmark, nav (`/cv`, `/about`, `/building`, `/notes`, `/contact`).
- `Footer.astro` — copyright, location, links, "built with…" line.
- `WorkEntry.astro`, `PatentEntry.astro`, `PublicationEntry.astro`, `EducationEntry.astro` — small focused renderers fed by the typed content.
- `ProjectCard.astro`, `NoteCard.astro` — index-page tiles.
- `Prose.astro` — typographic wrapper for long-form Markdown bodies.
- `Headshot.astro` — wraps Astro `<Image>` for the portrait. Source `src/assets/headshot.png`. Generates AVIF + WebP at responsive sizes, `loading="eager"` (above-the-fold on `/about`), with a low-quality blur-up placeholder. Treated as decorative-with-meaning: `alt="Brian Gautreau"`.

### PDF résumé

`/cv.pdf` is generated at build time, before the Astro build runs.

1. Astro is started in dev mode by `scripts/render-pdf.mjs`.
2. Playwright headless loads `/cv?print=1` (a print-stylesheet variant of the CV page).
3. Page is saved as `public/cv.pdf`.
4. The dev server is shut down; the regular `npm run build` runs and copies `public/cv.pdf` into `dist/` like any other static asset.

Implemented as a `prerender:pdf` npm script wired into `prebuild`. Single source of truth: the PDF cannot drift from the website because both render from the same typed CV data.

Playwright is a dev dependency only — it never runs inside the container.

## Design system

All values defined as CSS custom properties on `:root`, surfaced through a single `tokens.css`. No Tailwind. Colors in OKLCH only; chroma reduced near extremes; every neutral tinted toward the warm hue.

### Color (Restrained strategy: tinted neutrals + one accent ≤10%)

| Token         | OKLCH                  | Use                                   |
|---------------|------------------------|---------------------------------------|
| `--bg`        | `oklch(96% 0.012 75)`  | page background, warm off-white       |
| `--surface`   | `oklch(94% 0.014 75)`  | cards, insets                         |
| `--rule`      | `oklch(85% 0.012 75)`  | hairline rules                        |
| `--rule-soft` | `oklch(90% 0.010 75)`  | softer rules between rows             |
| `--ink`       | `oklch(22% 0.020 60)`  | primary text                          |
| `--ink-soft`  | `oklch(45% 0.015 60)`  | meta, labels                          |
| `--ink-mute`  | `oklch(60% 0.012 60)`  | faint text                            |
| `--accent`    | `oklch(48% 0.135 55)`  | sienna; links, dates, pills (≤10%)    |
| `--accent-soft` | `oklch(62% 0.110 55)` | hover state for accent                |

### Typography

| Token       | Family              | Use                            |
|-------------|---------------------|--------------------------------|
| `--serif`   | Fraunces (variable, opsz 9..144, wght 400/500/600/700) | display, headings, occasional italic emphasis |
| `--sans`    | Inter (variable, wght 400/500/600/700)                 | body, UI                       |
| `--mono`    | JetBrains Mono                                         | dates, code, the rare technical moment |

Type scale (line-height in parentheses):

| Step       | Size (px) | Family      | Weight | Tracking |
|------------|-----------|-------------|--------|----------|
| Display    | 56–64 (1.0)  | Fraunces | 600    | -0.022em |
| h2         | 40 (1.1)     | Fraunces | 600    | -0.018em |
| h3         | 26 (1.2)     | Fraunces | 600    | -0.010em |
| Body       | 17 (1.6)     | Inter    | 400    | normal   |
| Small      | 14 (1.5)     | Inter    | 400    | normal   |
| Eyebrow    | 12 (1.0)     | Inter    | 500    | +0.16em uppercase |
| Mono       | 14 (1.5)     | JetBrains Mono | 400 | normal |

Body text is capped at `max-width: 70ch`. Step ratio between body and h3 is ~1.5×; opens up further for display.

### Spacing

4px base. Tokens `--s-1` through `--s-10`: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`. Vary deliberately; the same padding everywhere is monotony.

### Motion

- View transitions (Astro built-in) on route changes: 8px y translate + opacity, `240ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Link hover: underline thickens, color shifts `--accent` → `--accent-soft`, `220ms ease-out`. No layout shift.
- Scroll reveal: off by default. If used, single `opacity 0 → 1` on first viewport entry. No staggered cascades.
- `@media (prefers-reduced-motion: reduce)`: all transitions collapsed to `opacity` only.

### Anti-patterns (explicit bans for this project)

- No `#000` or `#fff` anywhere.
- No gradient text (no `background-clip: text` + gradient).
- No side-stripe borders > 1px.
- No glassmorphism.
- No identical card grids.
- No em dashes in copy. Use periods, commas, colons, parentheses.
- No "hero metric template" cliché (big number + gradient accent + 4 mini-stats).

## Container & k8s

### Dockerfile (single stage)

The Astro build runs outside the container (in CI and during local dev). The container only serves the produced `dist/`.

- **Base:** `nginx:1.27-alpine`.
- Copy `nginx.conf` to `/etc/nginx/conf.d/default.conf`. Config: gzip on, `Cache-Control: public, max-age=31536000, immutable` for `/_astro/*`, `Cache-Control: no-cache` for HTML, custom `error_page 404 /404.html`, `listen 8080`.
- Copy `dist/` to `/usr/share/nginx/html`.
- Container listens on 8080 and runs as the non-root `nginx` user.

This trades "anyone can `docker build` from a clean checkout" for a small, fast container build. Local preview workflow: `npm run build && docker build -t briangautreau-com:dev . && docker run -p 8080:8080 briangautreau-com:dev`.

### k8s manifests (`k8s/`)

- `deployment.yaml` — 2 replicas, `RollingUpdate` (maxSurge 1, maxUnavailable 0), readiness/liveness probes on `GET /`, resource requests `cpu: 25m, memory: 32Mi`, limits `cpu: 200m, memory: 96Mi`. `runAsNonRoot: true`, drop all capabilities.
- `service.yaml` — `ClusterIP`, port 80 → containerPort 8080, name `briangautreau-com-svc`.
- `ingress-patch.yaml` — strategic-merge patch against the existing `default/nginx-ingress` Ingress: replace backend with `briangautreau-com-svc`, remove the `tls:` block. Hostname, class, and `ssl-redirect: "False"` annotation preserved.
- `kustomization.yaml` — names the resources, sets `images: [{ name: briangautreau-com, newName: docker.io/bgautrea/briangautreau-com, newTag: latest }]`. CI overwrites `newTag`.

### CI/CD

GitHub Actions workflow on push to `main`:

1. Checkout.
2. Setup Node 22, `npm ci`.
3. `npm run build` — produces `dist/` (and `public/cv.pdf` via the `prebuild` hook).
4. Validate: HTML validation against `dist/`, Lighthouse CI against a local server. Fails on any score < 95.
5. Build container with `docker buildx build --platform linux/amd64 -t bgautrea/briangautreau-com:<short-sha> -t bgautrea/briangautreau-com:latest .`.
6. Login to Docker Hub via `DOCKERHUB_TOKEN` secret (account `bgautrea`); push both tags.
7. Run `cd k8s && kustomize edit set image briangautreau-com=docker.io/bgautrea/briangautreau-com:<short-sha>`. Commit the manifest update back to `main` with a `[skip ci]` message and a `Co-Authored-By: github-actions` trailer.

No automatic deploy. To ship:

- Brian pulls `main` locally, then runs `kubectl apply -k k8s/` against `~/.kube/config.do`.
- The action's summary prints the exact command and the new image tag for convenience.

`~/.kube/config.do` is used only on Brian's machine for manual deploys. CI never sees it. CI requires only `DOCKERHUB_TOKEN` and the default `GITHUB_TOKEN` (for the manifest commit).

## Project structure

```
briangautreau.com/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.ico
│   └── cv.pdf                  ← generated at build
├── src/
│   ├── assets/
│   │   └── headshot.png        ← processed by Astro <Image>
│   ├── content/
│   │   ├── config.ts           ← Zod schemas for all collections
│   │   ├── cv/{work,patents,publications,education}.ts
│   │   ├── projects/*.md
│   │   └── notes/*.md
│   ├── components/             ← see Components section
│   ├── styles/
│   │   ├── tokens.css          ← all design tokens
│   │   ├── globals.css
│   │   └── print.css           ← /cv.pdf rendering
│   └── pages/                  ← see Routes section
├── scripts/
│   └── render-pdf.mjs          ← Playwright headless build step
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress-patch.yaml
│   └── kustomization.yaml
├── Dockerfile
├── nginx.conf
├── .dockerignore
├── .gitignore                  ← includes .superpowers/
├── .github/workflows/build.yml
├── docs/
│   └── superpowers/specs/2026-04-25-briangautreau-cv-design.md
└── README.md
```

## Accessibility & performance

- Semantic HTML throughout. Skip-link to main content. `<nav aria-label>` on every nav region.
- Color contrast verified: ink-on-bg ≥ 12:1, ink-soft-on-bg ≥ 7:1, accent-on-bg ≥ 4.5:1.
- Focus styles always visible; no `outline: none` without a visible replacement.
- Lighthouse target: 100 / 100 / 100 / 100 on the home page in mobile mode. CI runs Lighthouse and fails on score < 95 in any category.
- HTML validates (CI step).
- Total transferred bytes for `/` under 100 KB (excluding the variable font subsets, which lazy-load).
- Fonts: subset Fraunces and Inter to Latin only, served self-hosted from `public/fonts/` with `font-display: swap`.

## Outstanding decisions / future work (explicitly out of v1)

- Analytics. Plausible or none. Decide before launch.
- RSS feed for `/notes` (Astro plugin exists; trivial to add when notes exist).
- A `/now` page.
- Sentry or similar for client-side errors. Probably skip — site is static.
- Comments on notes (probably never).
- Image strategy for project case studies. Astro `<Image>` plus an `assets/` directory; can be added when first project needs it.

## Open content questions for Brian to answer before implementation

These shape copy but not architecture; can be filled in alongside the build, not before.

- Exact F5 dates and any earlier roles between Dell and F5.
- Phrasing for the personal-interest sections inside `/about`. The framing labels (Endurance / The aquarium / The print bed / The markets / The keyboard) are placeholders; refine when writing the copy.
- Specifics for `/about` Outside-work paragraphs: triathlon distance(s) and frequency; aquarium type (freshwater, planted, saltwater) and tank size; 3D printer model and what gets printed; investing focus (equities, options, macro).
- Email address to publish on `/contact`.
- LinkedIn / GitHub / X (or none) handles.
- Any military service to feature.
- Whether to publish patent links to USPTO directly.

## Headshot — visual handling

- Source: `src/assets/headshot.png` (warm beige background, head-and-shoulders, hoodie). Tonally already in the same family as `--bg` and `--surface`, so no special treatment is needed.
- No filter. No B&W. No duotone. Native color.
- On `/about`: ~360-440px wide on desktop, full-width-ish (with breathing room) on mobile. Slightly inset from the right edge of the intro block.
- Border radius: small (4px), not a circle. Editorial restraint, not avatar-y.
- Never appears on `/cv` or in the PDF.
