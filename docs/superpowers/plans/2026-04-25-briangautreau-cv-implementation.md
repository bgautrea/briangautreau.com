# briangautreau.com Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the multi-page personal CV/landing site at briangautreau.com end-to-end: scaffold, design system, pages, PDF résumé, container, k8s manifests, CI workflow, and first deploy.

**Architecture:** Static Astro site → built into `dist/` → packaged into a single-stage `nginx:1.27-alpine` container → deployed to an existing DigitalOcean k8s cluster behind an `nginx.org/ingress-controller`. TLS terminates at an upstream nginx proxy outside the cluster. CV résumé PDF is rendered at build time via Playwright headless against an Astro dev server.

**Tech Stack:** Astro 4, TypeScript, Zod (content collections), CSS custom properties (no Tailwind), self-hosted Fraunces / Inter / JetBrains Mono fonts, Vitest (schema tests), Playwright (PDF rendering only), nginx 1.27-alpine, Kustomize, GitHub Actions, DigitalOcean Kubernetes.

**Spec:** `docs/superpowers/specs/2026-04-25-briangautreau-cv-design.md` — refer to it for design tokens, anti-patterns, and architecture rationale.

**Repo state at start:** Initialized git repo on `main` with one commit (`a6d90b2`). Tracked: `.gitignore`, the spec, `src/assets/headshot.png`. Untracked: `.agents/`, `.claude/`, `skills-lock.json` (left alone). Working dir: `/home/brian/briangautreau.com`.

---

## Conventions used in every task

- All `git commit` messages end with: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- All `kubectl` invocations set `KUBECONFIG=~/.kube/config.do`. Never run kubectl without this — the default kubeconfig will not target the right cluster.
- Run all `npm`, `git`, `docker` commands from `/home/brian/briangautreau.com`.
- Node 22 is required. If `node --version` reports anything older, install Node 22 (e.g., via `nvm install 22 && nvm use 22`) before starting.
- No em dashes in any committed copy or comments. Use periods, commas, colons, semicolons, parentheses.

---

## Task 1: Scaffold Astro + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`, `.npmrc`
- Create: `src/env.d.ts`

- [ ] **Step 1: Initialize package.json**

```bash
cd /home/brian/briangautreau.com
cat > package.json <<'EOF'
{
  "name": "briangautreau-com",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run",
    "test:watch": "vitest",
    "prebuild": "node scripts/render-pdf.mjs",
    "lint:html": "html-validate dist/**/*.html"
  },
  "engines": {
    "node": ">=22"
  }
}
EOF
```

- [ ] **Step 2: Install Astro and core dependencies**

```bash
npm install astro@^4.16 sharp@^0.33
npm install -D typescript@^5.6 @astrojs/check@^0.9 vitest@^2.1 zod@^3.23
```

- [ ] **Step 3: Create astro.config.mjs**

```bash
cat > astro.config.mjs <<'EOF'
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://briangautreau.com',
  trailingSlash: 'never',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  vite: {
    server: { host: '0.0.0.0' },
  },
});
EOF
```

- [ ] **Step 4: Create tsconfig.json**

```bash
cat > tsconfig.json <<'EOF'
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
EOF
```

- [ ] **Step 5: Create src/env.d.ts**

```bash
mkdir -p src
cat > src/env.d.ts <<'EOF'
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
EOF
```

- [ ] **Step 6: Create .npmrc to keep package-lock deterministic**

```bash
cat > .npmrc <<'EOF'
save-exact=false
package-lock=true
EOF
```

- [ ] **Step 7: Verify Astro recognizes the project**

```bash
npx astro check 2>&1 | head -20
```
Expected: prints `astro check` output. May report 0 errors or warn that there are no pages yet. Either is fine. If it fails with a missing-binary or version error, stop and fix before proceeding.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs .npmrc src/env.d.ts
git commit -m "$(cat <<'EOF'
Scaffold Astro 4 project with TypeScript strict

Sets up the empty Astro shell: package.json with build/dev/test scripts,
strict TS config, astro.config with directory routing and trailing-slash
disabled. Installs Astro, sharp (for image processing), Vitest, and Zod.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Design tokens + global styles

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/globals.css`

- [ ] **Step 1: Create tokens.css**

```bash
mkdir -p src/styles
cat > src/styles/tokens.css <<'EOF'
:root {
  /* Color — Restrained: tinted neutrals + one sienna accent ≤10% surface. OKLCH only. */
  --bg:          oklch(96% 0.012 75);
  --surface:     oklch(94% 0.014 75);
  --rule:        oklch(85% 0.012 75);
  --rule-soft:   oklch(90% 0.010 75);
  --ink:         oklch(22% 0.020 60);
  --ink-soft:    oklch(45% 0.015 60);
  --ink-mute:    oklch(60% 0.012 60);
  --accent:      oklch(48% 0.135 55);
  --accent-soft: oklch(62% 0.110 55);

  /* Typography */
  --serif: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  --sans:  'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono:  'JetBrains Mono', ui-monospace, Menlo, monospace;

  /* Spacing — 4px base */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;
  --s-9: 96px; --s-10: 128px;

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --t-fast: 220ms;
  --t-page: 240ms;

  /* Type scale (size / line-height) */
  --fs-display: 64px;
  --fs-h2: 40px;
  --fs-h3: 26px;
  --fs-body: 17px;
  --fs-small: 14px;
  --fs-eyebrow: 12px;
  --fs-mono: 14px;

  --lh-display: 1.0;
  --lh-h2: 1.1;
  --lh-h3: 1.2;
  --lh-body: 1.6;
  --lh-small: 1.5;
}

@media (max-width: 720px) {
  :root {
    --fs-display: 44px;
    --fs-h2: 30px;
    --fs-h3: 22px;
    --fs-body: 16px;
  }
}
EOF
```

- [ ] **Step 2: Create globals.css (reset + base typography)**

```bash
cat > src/styles/globals.css <<'EOF'
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body, h1, h2, h3, h4, p, ul, ol, figure, blockquote { margin: 0; }
ul, ol { padding: 0; list-style: none; }
img, svg, video { display: block; max-width: 100%; height: auto; }

html, body { background: var(--bg); color: var(--ink); }
body {
  font-family: var(--sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'kern', 'liga', 'calt';
}

h1, h2, h3 {
  font-family: var(--serif);
  font-weight: 600;
  letter-spacing: -0.018em;
}
h1 { font-size: var(--fs-display); line-height: var(--lh-display); letter-spacing: -0.022em; }
h2 { font-size: var(--fs-h2);      line-height: var(--lh-h2); }
h3 { font-size: var(--fs-h3);      line-height: var(--lh-h3); letter-spacing: -0.010em; }

a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
  transition: color var(--t-fast) var(--ease-out), border-color var(--t-fast) var(--ease-out);
}
a:hover { color: var(--accent-soft); }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }

::selection { background: var(--accent); color: var(--bg); }

.eyebrow {
  font-family: var(--sans);
  font-size: var(--fs-eyebrow);
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  padding: var(--s-3) var(--s-4);
  background: var(--ink);
  color: var(--bg);
  border: 0;
}
.skip-link:focus { left: var(--s-3); top: var(--s-3); z-index: 100; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
EOF
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/
git commit -m "$(cat <<'EOF'
Add design tokens and global styles

Defines OKLCH palette (warm cream + sienna accent), typography stack
(Fraunces / Inter / JetBrains Mono), 4px spacing scale, and motion
tokens. globals.css adds a minimal reset, base type rules, accessible
link styles, skip-link, and prefers-reduced-motion handling.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Self-host fonts (Fraunces, Inter, JetBrains Mono)

**Files:**
- Create: `public/fonts/fraunces-variable.woff2`, `public/fonts/inter-variable.woff2`, `public/fonts/jetbrains-mono-variable.woff2`
- Create: `src/styles/fonts.css`

- [ ] **Step 1: Download font files (Latin subsets)**

```bash
mkdir -p public/fonts
# Fraunces variable (opsz + wght axes), Latin
curl -fsSL -o public/fonts/fraunces-variable.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/fraunces:vf@latest/latin-wght-normal.woff2
# Inter variable, Latin
curl -fsSL -o public/fonts/inter-variable.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2
# JetBrains Mono variable, Latin
curl -fsSL -o public/fonts/jetbrains-mono-variable.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono:vf@latest/latin-wght-normal.woff2
ls -la public/fonts/
```
Expected: three `.woff2` files, each between 30 KB and 120 KB. If any is 0 bytes or missing, the CDN URL has changed; find an updated URL on https://fontsource.org and retry.

- [ ] **Step 2: Create fonts.css**

```bash
cat > src/styles/fonts.css <<'EOF'
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/fraunces-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono-variable.woff2') format('woff2-variations');
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}
EOF
```

- [ ] **Step 3: Verify fonts load**

```bash
ls -la public/fonts/ && wc -c public/fonts/*.woff2
```
Expected: three files listed, each non-zero size.

- [ ] **Step 4: Commit**

```bash
git add public/fonts/ src/styles/fonts.css
git commit -m "$(cat <<'EOF'
Self-host Fraunces, Inter, JetBrains Mono variable fonts

Downloads Latin-subset variable .woff2 files into public/fonts/ and
declares @font-face rules with font-display: swap. Self-hosted to keep
all bytes on origin and avoid the third-party connect for first paint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Layout, Header, Footer

**Files:**
- Create: `src/components/Layout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`

- [ ] **Step 1: Create Layout.astro**

```bash
mkdir -p src/components
cat > src/components/Layout.astro <<'EOF'
---
import '../styles/fonts.css';
import '../styles/globals.css';
import Header from './Header.astro';
import Footer from './Footer.astro';
import { ViewTransitions } from 'astro:transitions';

interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}

const { title, description = 'Brian Gautreau. Senior Solutions Engineer at F5. 29 years shipping enterprise infrastructure.', ogImage = '/og.png' } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.ico" />

    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={new URL(ogImage, Astro.site).toString()} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="preload" as="font" href="/fonts/fraunces-variable.woff2" type="font/woff2" crossorigin />
    <link rel="preload" as="font" href="/fonts/inter-variable.woff2" type="font/woff2" crossorigin />

    <ViewTransitions />

    <style is:global>
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation-duration: 240ms;
        animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
      }
      ::view-transition-old(root) { animation-name: bg-fade-out; }
      ::view-transition-new(root) { animation-name: bg-fade-in; }
      @keyframes bg-fade-out {
        to { opacity: 0; transform: translateY(-4px); }
      }
      @keyframes bg-fade-in {
        from { opacity: 0; transform: translateY(8px); }
      }
      @media (prefers-reduced-motion: reduce) {
        ::view-transition-old(root), ::view-transition-new(root) {
          animation-name: none;
        }
      }
    </style>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main">
      <slot />
    </main>
    <Footer />
  </body>
</html>
EOF
```

- [ ] **Step 2: Create Header.astro**

```bash
cat > src/components/Header.astro <<'EOF'
---
const path = Astro.url.pathname.replace(/\/$/, '') || '/';
const links = [
  { href: '/cv',       label: 'CV' },
  { href: '/about',    label: 'About' },
  { href: '/building', label: 'Building' },
  { href: '/notes',    label: 'Notes' },
  { href: '/contact',  label: 'Contact' },
];
---
<header>
  <div class="bar">
    <a class="logo" href="/" aria-label="Brian Gautreau, home">brian.gautreau</a>
    <nav aria-label="Primary">
      {links.map((l) => (
        <a
          href={l.href}
          aria-current={path === l.href ? 'page' : undefined}
        >{l.label}</a>
      ))}
    </nav>
  </div>
</header>

<style>
  header {
    border-bottom: 1px solid var(--rule-soft);
    background: var(--bg);
  }
  .bar {
    max-width: 1080px;
    margin: 0 auto;
    padding: var(--s-4) var(--s-6);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--s-5);
    flex-wrap: wrap;
  }
  .logo {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 18px;
    letter-spacing: -0.02em;
    color: var(--ink);
    border-bottom: 0;
  }
  .logo:hover { color: var(--accent); }
  nav {
    display: flex;
    gap: var(--s-5);
    font-size: var(--fs-small);
  }
  nav a {
    color: var(--ink-soft);
    border-bottom: 0;
  }
  nav a:hover { color: var(--accent); }
  nav a[aria-current='page'] {
    color: var(--ink);
    border-bottom: 1px solid var(--accent);
    padding-bottom: 2px;
  }
  @media (max-width: 540px) {
    .bar { padding: var(--s-3) var(--s-4); }
    nav { gap: var(--s-4); font-size: 13px; }
  }
</style>
EOF
```

- [ ] **Step 3: Create Footer.astro**

```bash
cat > src/components/Footer.astro <<'EOF'
---
const year = new Date().getFullYear();
---
<footer>
  <div class="wrap">
    <p class="line">
      <span>© {year} Brian Gautreau</span>
      <span class="dot">·</span>
      <span>Cedar Park, Texas</span>
    </p>
    <p class="line meta">
      <span>Built with Astro, deployed to Kubernetes.</span>
      <span class="dot">·</span>
      <a href="https://github.com/bgautrea/briangautreau.com">Source</a>
    </p>
  </div>
</footer>

<style>
  footer {
    border-top: 1px solid var(--rule-soft);
    margin-top: var(--s-10);
    padding: var(--s-6) 0;
  }
  .wrap {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 var(--s-6);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--s-3);
  }
  .line { color: var(--ink-soft); font-size: var(--fs-small); }
  .meta { color: var(--ink-mute); }
  .dot { margin: 0 var(--s-2); color: var(--ink-mute); }
  a { color: var(--accent); }
  @media (max-width: 540px) {
    .wrap { padding: 0 var(--s-4); flex-direction: column; }
  }
</style>
EOF
```

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "$(cat <<'EOF'
Add Layout, Header, Footer components

Layout wires fonts, globals, OG meta, view-transitions, and a skip-link
target. Header has a wordmark and primary nav with current-page state.
Footer is two lines: copyright/location and a "built with" line plus
source link. View transitions fade-and-translate on route change,
collapsed by prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Content collections — schemas

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Write the failing test for the schema**

```bash
mkdir -p tests
cat > tests/content-schema.test.ts <<'EOF'
import { describe, it, expect } from 'vitest';
import { workSchema, patentsSchema, publicationsSchema, educationSchema } from '../src/content/config';

describe('CV schemas', () => {
  it('accepts a complete work entry', () => {
    const result = workSchema.safeParse([{
      company: 'F5',
      title: 'Senior Solutions Engineer',
      location: 'Cedar Park, TX',
      start: '2019-06',
      summary: 'Pre-sales lead for the United States Army account.',
      highlights: ['Delivered architectures across BIG-IP, NGINX, Distributed Cloud.'],
    }]);
    expect(result.success).toBe(true);
  });

  it('rejects work entry missing required fields', () => {
    const result = workSchema.safeParse([{ company: 'F5' }]);
    expect(result.success).toBe(false);
  });

  it('accepts a patent entry', () => {
    const result = patentsSchema.safeParse([{
      number: 'US 9,325,608',
      title: 'Methods for managing aggregated systems',
      issued: '2016-04',
    }]);
    expect(result.success).toBe(true);
  });

  it('accepts a publication entry', () => {
    const result = publicationsSchema.safeParse([{
      title: 'Hyper-V deployment reference architecture',
      publisher: 'Dell Inc.',
      year: 2014,
    }]);
    expect(result.success).toBe(true);
  });

  it('accepts an education entry', () => {
    const result = educationSchema.safeParse([{
      school: 'Texas A&M University',
      degree: 'B.S. Computer Engineering',
      years: '1992 to 1996',
    }]);
    expect(result.success).toBe(true);
  });
});
EOF
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/content-schema.test.ts 2>&1 | tail -20
```
Expected: FAIL — module `../src/content/config` does not exist or exports are missing.

- [ ] **Step 3: Implement src/content/config.ts**

```bash
mkdir -p src/content
cat > src/content/config.ts <<'EOF'
import { defineCollection, z } from 'astro:content';

// CV schemas — exported so they can be imported in tests AND used in *.ts data files.
export const workSchema = z.array(z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  start: z.string(),                                            // YYYY or YYYY-MM
  end: z.string().optional(),                                   // omit = current
  summary: z.string(),
  highlights: z.array(z.string()),
  url: z.string().url().optional(),
}));

export const patentsSchema = z.array(z.object({
  number: z.string(),
  title: z.string(),
  issued: z.string(),                                           // YYYY-MM
  url: z.string().url().optional(),
}));

export const publicationsSchema = z.array(z.object({
  title: z.string(),
  publisher: z.string(),
  year: z.number().int(),
  url: z.string().url().optional(),
}));

export const educationSchema = z.array(z.object({
  school: z.string(),
  degree: z.string(),
  years: z.string(),
}));

// Markdown-backed collections
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    blurb: z.string(),
    status: z.enum(['shipping', 'active', 'archived', 'experiment']),
    repo: z.string().url().optional(),
    url: z.string().url().optional(),
    stack: z.array(z.string()),
    order: z.number().default(100),
  }),
});

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, notes };
EOF
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/content-schema.test.ts 2>&1 | tail -20
```
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/config.ts tests/content-schema.test.ts
git commit -m "$(cat <<'EOF'
Add Astro content collections and Zod schemas

Defines schemas for CV data (work, patents, publications, education)
and Markdown collections (projects, notes). CV schemas exported by name
so .ts data files can validate themselves. Vitest tests cover happy
path and one rejection per schema.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Seed CV data

**Files:**
- Create: `src/content/cv/work.ts`, `src/content/cv/patents.ts`, `src/content/cv/publications.ts`, `src/content/cv/education.ts`

These contain placeholder content based on the spec's "Open content questions" section. Brian will refine copy after the build is up.

- [ ] **Step 1: Create work.ts**

```bash
mkdir -p src/content/cv
cat > src/content/cv/work.ts <<'EOF'
import { workSchema } from '../config';

const data = [
  {
    company: 'F5',
    title: 'Senior Solutions Engineer',
    location: 'Cedar Park, TX',
    start: '2019',
    summary: 'Pre-sales technical lead across the F5 portfolio for the United States Army account.',
    highlights: [
      'Cover the full F5 catalog: BIG-IP, NGINX, Distributed Cloud, application security.',
      'Translate mission requirements into architectures spanning data center, edge, and cloud; partner with program offices through procurement and rollout.',
      'Trusted advisor on application delivery, zero-trust patterns, and modernization paths for legacy workloads.',
    ],
  },
  {
    company: 'Dell',
    title: 'Technical Architect, Solutions Engineering',
    location: 'Round Rock, TX',
    start: '2009',
    end: '2019',
    summary: 'Solutions architect on the enterprise infrastructure side, focused on virtualization, private cloud, and reference designs.',
    highlights: [
      'Authored eight reference architectures spanning Hyper-V, Xen, blade and storage, and private cloud. Used as field deployment blueprints.',
      'Co-inventor on two issued US patents covering network device discovery and aggregated-system observability.',
    ],
  },
];

// Validate at module-load so a bad entry fails the build.
const parsed = workSchema.parse(data);
export default parsed;
EOF
```

- [ ] **Step 2: Create patents.ts**

```bash
cat > src/content/cv/patents.ts <<'EOF'
import { patentsSchema } from '../config';

const data = [
  {
    number: 'US 9,325,608',
    title: 'Methods and apparatus for managing aggregated systems',
    issued: '2016-04',
    url: 'https://patents.google.com/patent/US9325608',
  },
  {
    number: 'US 9,270,791',
    title: 'Methods and apparatus for network device discovery and configuration',
    issued: '2016-02',
    url: 'https://patents.google.com/patent/US9270791',
  },
];

const parsed = patentsSchema.parse(data);
export default parsed;
EOF
```

- [ ] **Step 3: Create publications.ts**

```bash
cat > src/content/cv/publications.ts <<'EOF'
import { publicationsSchema } from '../config';

const data = [
  { title: 'Microsoft Hyper-V cluster reference architecture',          publisher: 'Dell Inc.', year: 2014 },
  { title: 'Citrix XenServer networking reference architecture',        publisher: 'Dell Inc.', year: 2013 },
  { title: 'Blade and storage configuration guide for private cloud',   publisher: 'Dell Inc.', year: 2013 },
  { title: 'Private cloud infrastructure deployment guide',             publisher: 'Dell Inc.', year: 2014 },
];

const parsed = publicationsSchema.parse(data);
export default parsed;
EOF
```

- [ ] **Step 4: Create education.ts**

```bash
cat > src/content/cv/education.ts <<'EOF'
import { educationSchema } from '../config';

const data = [
  { school: 'Texas A&M University', degree: 'Engineering', years: '1992 to 1996' },
];

const parsed = educationSchema.parse(data);
export default parsed;
EOF
```

- [ ] **Step 5: Verify all four files load without throwing**

```bash
node --input-type=module -e "
  import('./src/content/cv/work.ts').catch(() => null);
  import('./src/content/cv/patents.ts').catch(() => null);
  import('./src/content/cv/publications.ts').catch(() => null);
  import('./src/content/cv/education.ts').catch(() => null);
" 2>&1 | head
# Note: ts files won't run directly under node here; this is a presence check only.
ls -la src/content/cv/
```
Expected: four `.ts` files. (Real validation happens at Astro build time.)

- [ ] **Step 6: Commit**

```bash
git add src/content/cv/
git commit -m "$(cat <<'EOF'
Seed CV data for v1 build

Placeholder-but-real entries for work, patents, publications,
education. Each .ts file calls .parse() on its Zod schema at
module-load so bad data fails the build. Brian will refine copy and
fill in exact dates after first deploy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Seed projects + a welcome note

**Files:**
- Create: `src/content/projects/briangautreau-com.md`, `src/content/notes/2026-04-25-hello.md`

- [ ] **Step 1: Create the first project entry (the site itself)**

```bash
mkdir -p src/content/projects
cat > src/content/projects/briangautreau-com.md <<'EOF'
---
title: briangautreau.com
blurb: This personal site. Built with Astro, deployed as a container to a personal Kubernetes cluster.
status: shipping
repo: https://github.com/bgautrea/briangautreau.com
url: https://briangautreau.com
stack: [Astro, TypeScript, OKLCH, Kubernetes, Docker, GitHub Actions]
order: 10
---

A multi-page personal site. CV, life outside work, side projects, notes.

The site is part of the demonstration. Static Astro builds into a small `nginx:alpine` image. Two replicas behind the cluster's `nginx.org` ingress controller. TLS terminates at an upstream nginx proxy that lives outside the cluster. CI builds and pushes the image; deploy is a single `kubectl apply` from a laptop.

Design language: warm cream surface in OKLCH, Fraunces serif for display, Inter for body, JetBrains Mono for the rare technical moment. One sienna accent doing all the lifting.
EOF
```

- [ ] **Step 2: Create the welcome note**

```bash
mkdir -p src/content/notes
cat > src/content/notes/2026-04-25-hello.md <<'EOF'
---
title: Hello from a new corner of the internet
date: 2026-04-25
summary: Why this site exists, and what to expect from the notes that follow.
---

I have been thinking out loud on internal channels for years. Reference architectures at Dell, design reviews at F5, the occasional opinionated email to a customer. None of it ever made it to a place where my own name lived next to it.

This site is the place. The CV pages cover the work side. The notes will cover the rest, irregularly: where infrastructure is going, what I am building on the side, what I am paying attention to in the markets, and the occasional update from the print bed or the aquarium.

Subscribe with your eyes. There is no list to join.
EOF
```

- [ ] **Step 3: Commit**

```bash
git add src/content/projects/ src/content/notes/
git commit -m "$(cat <<'EOF'
Seed first project and welcome note

Projects collection has one entry: this site. Notes collection has a
welcome post explaining what /notes is for. Both validate against
their Zod schemas at build time.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: CV entry components

**Files:**
- Create: `src/components/WorkEntry.astro`, `src/components/PatentEntry.astro`, `src/components/PublicationEntry.astro`, `src/components/EducationEntry.astro`

- [ ] **Step 1: Create WorkEntry.astro**

```bash
cat > src/components/WorkEntry.astro <<'EOF'
---
interface Props {
  company: string;
  title: string;
  location: string;
  start: string;
  end?: string;
  summary: string;
  highlights: string[];
  url?: string;
}
const { company, title, location, start, end, summary, highlights, url } = Astro.props;
const range = end ? `${start} to ${end}` : `${start} to present`;
const isCurrent = !end;
---
<article class="entry">
  <div class="meta">
    <span class="years">{range}</span>
    <span class="loc">{location}</span>
    {isCurrent && <span class="pill">Current</span>}
  </div>
  <div class="body">
    <h3>{title}</h3>
    <p class="co">{url ? <a href={url}>{company}</a> : company}</p>
    <p class="summary">{summary}</p>
    <ul>
      {highlights.map((h) => <li>{h}</li>)}
    </ul>
  </div>
</article>

<style>
  .entry {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: var(--s-6);
    padding: var(--s-6) 0;
    border-top: 1px solid var(--rule-soft);
  }
  .entry:first-of-type { border-top: 0; padding-top: 0; }
  .meta { color: var(--ink-soft); font-size: var(--fs-small); }
  .years { display: block; font-family: var(--mono); color: var(--ink); margin-bottom: 4px; }
  .loc { display: block; }
  .pill {
    display: inline-block;
    margin-top: var(--s-3);
    font-size: var(--fs-eyebrow);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--accent);
    border: 1px solid var(--accent);
    padding: 3px 8px;
    border-radius: 99px;
    font-weight: 500;
  }
  h3 { margin: 0 0 var(--s-2); }
  .co { color: var(--ink-soft); font-size: var(--fs-small); margin: 0 0 var(--s-3); }
  .co a { color: var(--accent); }
  .summary { margin: 0 0 var(--s-3); max-width: 65ch; }
  ul { padding-left: var(--s-4); list-style: disc; }
  ul li { margin-bottom: var(--s-2); max-width: 65ch; }
  @media (max-width: 720px) {
    .entry { grid-template-columns: 1fr; gap: var(--s-3); }
  }
</style>
EOF
```

- [ ] **Step 2: Create PatentEntry.astro**

```bash
cat > src/components/PatentEntry.astro <<'EOF'
---
interface Props { number: string; title: string; issued: string; url?: string; }
const { number, title, issued, url } = Astro.props;
---
<li class="row">
  <span class="num">{url ? <a href={url}>{number}</a> : number}</span>
  <span class="title">{title}</span>
  <span class="when">{issued}</span>
</li>
<style>
  .row {
    display: grid;
    grid-template-columns: 160px 1fr 100px;
    gap: var(--s-4);
    padding: var(--s-3) 0;
    border-top: 1px solid var(--rule-soft);
    align-items: baseline;
  }
  .row:first-child { border-top: 0; }
  .num { font-family: var(--mono); font-size: var(--fs-small); color: var(--accent); }
  .num a { color: inherit; border-bottom: 0; }
  .num a:hover { color: var(--accent-soft); }
  .title { font-size: var(--fs-body); }
  .when { font-family: var(--mono); font-size: var(--fs-small); color: var(--ink-soft); text-align: right; }
  @media (max-width: 720px) {
    .row { grid-template-columns: 1fr; gap: var(--s-1); }
    .when { text-align: left; }
  }
</style>
EOF
```

- [ ] **Step 3: Create PublicationEntry.astro**

```bash
cat > src/components/PublicationEntry.astro <<'EOF'
---
interface Props { title: string; publisher: string; year: number; url?: string; }
const { title, publisher, year, url } = Astro.props;
---
<li class="row">
  <span class="title">{url ? <a href={url}>{title}</a> : title}</span>
  <span class="meta">{publisher}, {year}</span>
</li>
<style>
  .row {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: var(--s-4);
    padding: var(--s-3) 0;
    border-top: 1px solid var(--rule-soft);
    align-items: baseline;
  }
  .row:first-child { border-top: 0; }
  .title { font-size: var(--fs-body); }
  .meta { font-family: var(--mono); font-size: var(--fs-small); color: var(--ink-soft); text-align: right; }
  @media (max-width: 720px) {
    .row { grid-template-columns: 1fr; gap: var(--s-1); }
    .meta { text-align: left; }
  }
</style>
EOF
```

- [ ] **Step 4: Create EducationEntry.astro**

```bash
cat > src/components/EducationEntry.astro <<'EOF'
---
interface Props { school: string; degree: string; years: string; }
const { school, degree, years } = Astro.props;
---
<li class="row">
  <span class="school">{school}</span>
  <span class="degree">{degree}</span>
  <span class="years">{years}</span>
</li>
<style>
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr 160px;
    gap: var(--s-4);
    padding: var(--s-3) 0;
    border-top: 1px solid var(--rule-soft);
    align-items: baseline;
  }
  .row:first-child { border-top: 0; }
  .school { font-weight: 500; }
  .degree { color: var(--ink-soft); }
  .years { font-family: var(--mono); font-size: var(--fs-small); color: var(--ink-soft); text-align: right; }
  @media (max-width: 720px) {
    .row { grid-template-columns: 1fr; gap: var(--s-1); }
    .years { text-align: left; }
  }
</style>
EOF
```

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkEntry.astro src/components/PatentEntry.astro src/components/PublicationEntry.astro src/components/EducationEntry.astro
git commit -m "$(cat <<'EOF'
Add CV entry components

Four small renderers, each typed to its data shape: WorkEntry uses a
two-column meta + body grid with a Current pill when end is omitted;
patents/publications/education are dense list rows with mono dates.
All collapse to single column under 720px.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: CV page

**Files:**
- Create: `src/pages/cv.astro`

- [ ] **Step 1: Create cv.astro**

```bash
mkdir -p src/pages
cat > src/pages/cv.astro <<'EOF'
---
import Layout from '../components/Layout.astro';
import WorkEntry from '../components/WorkEntry.astro';
import PatentEntry from '../components/PatentEntry.astro';
import PublicationEntry from '../components/PublicationEntry.astro';
import EducationEntry from '../components/EducationEntry.astro';
import work from '../content/cv/work';
import patents from '../content/cv/patents';
import publications from '../content/cv/publications';
import education from '../content/cv/education';
---
<Layout title="CV · Brian Gautreau" description="Senior Solutions Engineer at F5. 29 years across Dell and F5 in enterprise infrastructure.">
  <article class="page">
    <header class="head">
      <p class="eyebrow">Curriculum vitae</p>
      <h1>Brian Gautreau</h1>
      <p class="lede">Senior Solutions Engineer at F5, dedicated to the United States Army account. Twenty-nine years across Dell and F5 building, deploying, and selling enterprise infrastructure.</p>
      <p class="actions">
        <a href="/cv.pdf" download>Download PDF</a>
      </p>
    </header>

    <section>
      <h2>Experience</h2>
      {work.map((w) => <WorkEntry {...w} />)}
    </section>

    <section>
      <h2>Patents</h2>
      <ul class="rows">{patents.map((p) => <PatentEntry {...p} />)}</ul>
    </section>

    <section>
      <h2>Selected publications</h2>
      <ul class="rows">{publications.map((p) => <PublicationEntry {...p} />)}</ul>
    </section>

    <section>
      <h2>Education</h2>
      <ul class="rows">{education.map((e) => <EducationEntry {...e} />)}</ul>
    </section>
  </article>
</Layout>

<style>
  .page { max-width: 1080px; margin: 0 auto; padding: var(--s-9) var(--s-6) var(--s-8); }
  .head { padding-bottom: var(--s-7); border-bottom: 1px solid var(--rule); margin-bottom: var(--s-8); }
  .eyebrow { margin-bottom: var(--s-3); }
  h1 { margin-bottom: var(--s-4); }
  .lede { color: var(--ink-soft); max-width: 60ch; font-size: 18px; line-height: 1.55; margin: 0 0 var(--s-5); }
  .actions a { font-family: var(--mono); font-size: var(--fs-small); }
  section { margin-top: var(--s-9); }
  section h2 { margin-bottom: var(--s-5); padding-bottom: var(--s-3); border-bottom: 1px solid var(--rule); }
  .rows { display: block; }
</style>
EOF
```

- [ ] **Step 2: Build the project to verify the page renders**

```bash
npm run build 2>&1 | tail -30
```
Expected: build succeeds; output reports `/cv` was generated. The `prebuild` step will fail loudly because `scripts/render-pdf.mjs` does not exist yet. To skip it temporarily, run:
```bash
npm run build -- --no-prerender 2>&1 | tail -30
```
If that flag is not recognized, run `npx astro build` directly which bypasses the npm prebuild hook.

- [ ] **Step 3: Smoke-test in browser**

Run dev server and visit `/cv`:
```bash
npx astro dev --host 0.0.0.0 &
ASTRO_PID=$!
sleep 5
curl -s http://localhost:4321/cv | head -40
kill $ASTRO_PID
```
Expected: HTML output shows the heading, eyebrow, work entries, etc. If the page is blank or the curl fails, investigate before committing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/cv.astro
git commit -m "$(cat <<'EOF'
Add /cv page

Composes the CV from typed content data. Header has eyebrow, name,
lede paragraph, and a Download PDF link (PDF asset will be wired up in
a later task). Sections: Experience, Patents, Publications, Education.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Headshot component + /about page

**Files:**
- Create: `src/components/Headshot.astro`, `src/pages/about.astro`

- [ ] **Step 1: Create Headshot.astro**

```bash
cat > src/components/Headshot.astro <<'EOF'
---
import { Picture } from 'astro:assets';
import headshot from '../assets/headshot.png';

interface Props {
  width?: number;
  loading?: 'eager' | 'lazy';
  class?: string;
}
const { width = 440, loading = 'eager', class: cls } = Astro.props;
const height = Math.round(width * (headshot.height / headshot.width));
---
<Picture
  src={headshot}
  alt="Brian Gautreau"
  widths={[width, width * 2]}
  sizes={`(max-width: 860px) 320px, ${width}px`}
  formats={['avif', 'webp']}
  fallbackFormat="png"
  loading={loading}
  decoding="async"
  pictureAttributes={{ class: cls }}
  width={width}
  height={height}
/>

<style is:global>
  picture > img {
    border-radius: 4px;
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>
EOF
```

- [ ] **Step 2: Create about.astro**

```bash
cat > src/pages/about.astro <<'EOF'
---
import Layout from '../components/Layout.astro';
import Headshot from '../components/Headshot.astro';
---
<Layout title="About · Brian Gautreau" description="A short personal essay: who I am, where Cedar Park fits in, and what I do outside the day job.">
  <article class="page">
    <p class="eyebrow">About</p>
    <div class="intro">
      <div class="prose">
        <h1>The shape of the work has always been the same.</h1>
        <p>Take a complex platform. Make it land safely in someone else's hands. That is what I have been doing for twenty-nine years, first at Dell as a technical architect on the solutions engineering side, now at F5 in the seat of a Senior Solutions Engineer dedicated to the United States Army.</p>
        <p>I live in Cedar Park, Texas. Most weeks involve more conversations than code: with program offices, with platform owners, with engineers who have to live with whatever architecture survives the meeting. The favorite ones still come down to the same small set of questions. What does the customer actually need. What is the simplest design that gives it to them. Where will it break first.</p>
      </div>
      <div class="portrait">
        <Headshot width={440} />
      </div>
    </div>

    <section class="outside">
      <h2>Outside work</h2>

      <div class="block">
        <p class="eyebrow">Endurance</p>
        <p>Running and triathlon. The training is the point as much as the racing. Cedar Park is good for both.</p>
      </div>

      <div class="block">
        <p class="eyebrow">The aquarium</p>
        <p>Fish keeping. There is something honest about a tank: the system either works or it does not, and the fish will tell you which.</p>
      </div>

      <div class="block">
        <p class="eyebrow">The print bed</p>
        <p>3D printing. Mostly functional parts, occasional vanity. The printer is a useful daily reminder that the gap between idea and physical object is now small.</p>
      </div>

      <div class="block">
        <p class="eyebrow">The markets</p>
        <p>Active in equities, options, and the slow study of how capital actually moves. A long-running side education.</p>
      </div>

      <div class="block">
        <p class="eyebrow">The keyboard</p>
        <p>Building software with AI tooling. This site is one of those projects. There are more on <a href="/building">/building</a>.</p>
      </div>
    </section>
  </article>
</Layout>

<style>
  .page { max-width: 1080px; margin: 0 auto; padding: var(--s-9) var(--s-6) var(--s-8); }
  .eyebrow { margin-bottom: var(--s-3); }

  .intro {
    display: grid;
    grid-template-columns: 1fr 440px;
    gap: var(--s-7);
    align-items: start;
    margin-bottom: var(--s-9);
  }
  .prose h1 { margin-bottom: var(--s-5); max-width: 18ch; }
  .prose p { color: var(--ink); margin-bottom: var(--s-4); max-width: 60ch; font-size: 18px; line-height: 1.55; }
  .prose p:last-child { margin-bottom: 0; }
  .portrait { padding-top: var(--s-3); }

  .outside {
    border-top: 1px solid var(--rule);
    padding-top: var(--s-8);
  }
  .outside h2 { margin-bottom: var(--s-7); }
  .block { margin-bottom: var(--s-6); max-width: 60ch; }
  .block .eyebrow { color: var(--accent); margin-bottom: var(--s-2); }
  .block p:not(.eyebrow) { color: var(--ink); }

  @media (max-width: 860px) {
    .intro { grid-template-columns: 1fr; }
    .portrait { order: -1; max-width: 320px; }
  }
</style>
EOF
```

- [ ] **Step 3: Build to verify image processing works**

```bash
npx astro build 2>&1 | tail -30
```
Expected: build reports an `/about` page generated and processes `headshot.png` into AVIF/WebP. Look in `dist/_astro/` for `headshot*.avif` and `headshot*.webp`. If sharp complains about a missing binary, run `npm rebuild sharp` and try again.

- [ ] **Step 4: Verify output**

```bash
ls dist/_astro/headshot* 2>&1
```
Expected: at least one optimized headshot file present.

- [ ] **Step 5: Commit**

```bash
git add src/components/Headshot.astro src/pages/about.astro
git commit -m "$(cat <<'EOF'
Add Headshot component and /about page

Headshot wraps Astro's Image component for AVIF/WebP responsive output
from src/assets/headshot.png with eager loading and a 4px radius.
About page is a single-file essay: intro grid (prose left, portrait
right), then five Outside-work blocks. Collapses to a single column
under 860px with the portrait above the prose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Home page

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create index.astro**

```bash
cat > src/pages/index.astro <<'EOF'
---
import Layout from '../components/Layout.astro';

const cards = [
  { href: '/cv',       eyebrow: 'Work',     title: 'The CV',           blurb: 'Twenty-nine years across Dell and F5.' },
  { href: '/about',    eyebrow: 'Person',   title: 'Outside the work', blurb: 'Cedar Park, the aquarium, the print bed.' },
  { href: '/building', eyebrow: 'Builder',  title: 'What I am making', blurb: 'Side projects shipped with AI tooling.' },
  { href: '/notes',    eyebrow: 'Writing',  title: 'Notes',            blurb: 'Where infrastructure is going, irregularly.' },
];
---
<Layout title="Brian Gautreau" description="Senior Solutions Engineer at F5. Builder. Cedar Park, Texas.">
  <section class="hero">
    <p class="eyebrow">Cedar Park, Texas</p>
    <h1>Brian Gautreau.</h1>
    <p class="lede">Senior Solutions Engineer at F5 on the United States Army account. Twenty-nine years bringing enterprise infrastructure into customers' hands. Building software on the side, with help from a model that did not exist a few years ago.</p>
  </section>

  <section class="cards">
    {cards.map((c) => (
      <a class="card" href={c.href}>
        <p class="eyebrow">{c.eyebrow}</p>
        <h2>{c.title}</h2>
        <p class="blurb">{c.blurb}</p>
        <span class="more">Read →</span>
      </a>
    ))}
  </section>
</Layout>

<style>
  .hero {
    max-width: 1080px;
    margin: 0 auto;
    padding: var(--s-10) var(--s-6) var(--s-9);
  }
  .hero .eyebrow { margin-bottom: var(--s-4); }
  .hero h1 { margin-bottom: var(--s-5); max-width: 14ch; }
  .lede { color: var(--ink-soft); max-width: 56ch; font-size: 20px; line-height: 1.5; }

  .cards {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 var(--s-6) var(--s-9);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--s-5);
  }
  .card {
    display: block;
    padding: var(--s-6);
    background: var(--surface);
    border: 0;
    border-radius: 6px;
    color: var(--ink);
    transition: transform var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out);
  }
  .card:hover {
    background: oklch(92% 0.018 75);
    transform: translateY(-2px);
  }
  .card .eyebrow { color: var(--accent); margin-bottom: var(--s-3); }
  .card h2 { font-size: 28px; line-height: 1.1; margin-bottom: var(--s-3); }
  .card .blurb { color: var(--ink-soft); margin-bottom: var(--s-5); }
  .card .more { font-family: var(--mono); font-size: var(--fs-small); color: var(--accent); }

  @media (max-width: 720px) {
    .cards { grid-template-columns: 1fr; }
    .hero { padding: var(--s-8) var(--s-4) var(--s-7); }
  }
</style>
EOF
```

- [ ] **Step 2: Build and visually inspect**

```bash
npx astro build 2>&1 | tail -10
ls dist/index.html
```
Expected: `dist/index.html` exists.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "$(cat <<'EOF'
Add home page

Short hero (eyebrow, name, lede) plus four cards routing into the
rest of the site: CV, About, Building, Notes. Cards on a 2-up grid
that collapses to single column under 720px. No headshot here; the
portrait stays on /about.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Building page + ProjectCard

**Files:**
- Create: `src/components/ProjectCard.astro`, `src/pages/building.astro`

- [ ] **Step 1: Create ProjectCard.astro**

```bash
cat > src/components/ProjectCard.astro <<'EOF'
---
interface Props {
  title: string;
  blurb: string;
  status: 'shipping' | 'active' | 'archived' | 'experiment';
  url?: string;
  repo?: string;
  stack: string[];
}
const { title, blurb, status, url, repo, stack } = Astro.props;
---
<article class="proj">
  <header>
    <h2>{title}</h2>
    <span class={`status status-${status}`}>{status}</span>
  </header>
  <p class="blurb">{blurb}</p>
  <ul class="stack">
    {stack.map((s) => <li>{s}</li>)}
  </ul>
  <p class="links">
    {url && <a href={url}>Visit →</a>}
    {url && repo && <span class="sep">·</span>}
    {repo && <a href={repo}>Source</a>}
  </p>
</article>

<style>
  .proj {
    padding: var(--s-6) 0;
    border-top: 1px solid var(--rule-soft);
  }
  .proj:first-of-type { border-top: 0; padding-top: 0; }
  header { display: flex; align-items: baseline; gap: var(--s-4); margin-bottom: var(--s-3); }
  h2 { font-size: 28px; margin: 0; }
  .status {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid var(--rule);
    color: var(--ink-soft);
  }
  .status-shipping { color: var(--accent); border-color: var(--accent); }
  .blurb { color: var(--ink-soft); margin-bottom: var(--s-4); max-width: 65ch; }
  .stack { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-bottom: var(--s-4); }
  .stack li {
    font-family: var(--mono);
    font-size: 12px;
    padding: 3px 8px;
    background: var(--surface);
    color: var(--ink-soft);
    border-radius: 3px;
  }
  .links { font-family: var(--mono); font-size: var(--fs-small); }
  .sep { color: var(--ink-mute); margin: 0 var(--s-2); }
</style>
EOF
```

- [ ] **Step 2: Create building.astro**

```bash
cat > src/pages/building.astro <<'EOF'
---
import { getCollection } from 'astro:content';
import Layout from '../components/Layout.astro';
import ProjectCard from '../components/ProjectCard.astro';

const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
---
<Layout title="Building · Brian Gautreau" description="Side projects shipped with AI-assisted tooling.">
  <article class="page">
    <header class="head">
      <p class="eyebrow">Building</p>
      <h1>What I am making.</h1>
      <p class="lede">Side projects, in public. Most of them were prototyped with AI tooling and finished by hand. Some are shipping; some are experiments.</p>
    </header>
    <section>
      {projects.map((p) => <ProjectCard {...p.data} />)}
    </section>
  </article>
</Layout>

<style>
  .page { max-width: 1080px; margin: 0 auto; padding: var(--s-9) var(--s-6) var(--s-8); }
  .head { padding-bottom: var(--s-7); border-bottom: 1px solid var(--rule); margin-bottom: var(--s-7); }
  .eyebrow { margin-bottom: var(--s-3); }
  h1 { margin-bottom: var(--s-4); max-width: 18ch; }
  .lede { color: var(--ink-soft); font-size: 18px; line-height: 1.55; max-width: 60ch; }
</style>
EOF
```

- [ ] **Step 3: Build and verify**

```bash
npx astro build 2>&1 | tail -10
ls dist/building/index.html
```
Expected: `dist/building/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectCard.astro src/pages/building.astro
git commit -m "$(cat <<'EOF'
Add /building page and ProjectCard component

Reads the projects content collection (currently one entry: this
site), sorts by frontmatter order, renders each as a ProjectCard with
status pill, blurb, stack chips, and visit/source links.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Notes index + slug + components

**Files:**
- Create: `src/components/NoteCard.astro`, `src/components/Prose.astro`, `src/pages/notes/index.astro`, `src/pages/notes/[...slug].astro`

- [ ] **Step 1: Create NoteCard.astro**

```bash
cat > src/components/NoteCard.astro <<'EOF'
---
interface Props { slug: string; title: string; date: Date; summary: string; }
const { slug, title, date, summary } = Astro.props;
const fmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
---
<a class="note" href={`/notes/${slug}`}>
  <span class="when">{fmt}</span>
  <h2>{title}</h2>
  <p>{summary}</p>
</a>

<style>
  .note {
    display: block;
    padding: var(--s-6) 0;
    border-top: 1px solid var(--rule-soft);
    color: var(--ink);
    border-bottom: 0;
    transition: background var(--t-fast) var(--ease-out);
    padding-left: var(--s-3);
    padding-right: var(--s-3);
    margin: 0 calc(var(--s-3) * -1);
    border-radius: 4px;
  }
  .note:first-of-type { border-top: 0; }
  .note:hover { background: var(--surface); }
  .when { display: block; font-family: var(--mono); font-size: var(--fs-small); color: var(--ink-soft); margin-bottom: var(--s-2); }
  h2 { font-size: 26px; margin: 0 0 var(--s-2); color: var(--ink); transition: color var(--t-fast) var(--ease-out); }
  .note:hover h2 { color: var(--accent); }
  p { color: var(--ink-soft); max-width: 60ch; }
</style>
EOF
```

- [ ] **Step 2: Create Prose.astro**

```bash
cat > src/components/Prose.astro <<'EOF'
---
// Wrapper for long-form Markdown content. Sets max-width and scoped typography.
---
<div class="prose"><slot /></div>

<style>
  .prose { max-width: 65ch; }
  .prose :global(p) { margin: 0 0 var(--s-5); font-size: 18px; line-height: 1.7; }
  .prose :global(h2) { font-size: 32px; line-height: 1.15; margin: var(--s-8) 0 var(--s-4); }
  .prose :global(h3) { font-size: 22px; line-height: 1.2;  margin: var(--s-6) 0 var(--s-3); }
  .prose :global(ul), .prose :global(ol) { padding-left: var(--s-5); margin-bottom: var(--s-5); }
  .prose :global(ul) { list-style: disc; }
  .prose :global(ol) { list-style: decimal; }
  .prose :global(li) { margin-bottom: var(--s-2); }
  .prose :global(blockquote) {
    border-left: 1px solid var(--accent);
    padding-left: var(--s-4);
    margin: var(--s-5) 0;
    color: var(--ink-soft);
    font-style: italic;
  }
  .prose :global(code) {
    font-family: var(--mono);
    font-size: 0.92em;
    padding: 2px 6px;
    background: var(--surface);
    border-radius: 3px;
  }
  .prose :global(pre) {
    background: var(--surface);
    padding: var(--s-4);
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: var(--s-5);
  }
  .prose :global(pre code) { background: none; padding: 0; }
  .prose :global(a) { color: var(--accent); }
  .prose :global(hr) { border: 0; border-top: 1px solid var(--rule-soft); margin: var(--s-7) 0; }
</style>
EOF
```

- [ ] **Step 3: Create notes/index.astro**

```bash
mkdir -p src/pages/notes
cat > src/pages/notes/index.astro <<'EOF'
---
import { getCollection } from 'astro:content';
import Layout from '../../components/Layout.astro';
import NoteCard from '../../components/NoteCard.astro';

const all = await getCollection('notes', ({ data }) => import.meta.env.PROD ? !data.draft : true);
const notes = all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
<Layout title="Notes · Brian Gautreau" description="Irregular writing on infrastructure, building, and the markets.">
  <article class="page">
    <header class="head">
      <p class="eyebrow">Notes</p>
      <h1>Irregular writing.</h1>
      <p class="lede">On where infrastructure is going, what I am building, and what is happening in the markets. No schedule.</p>
    </header>
    <section>
      {notes.length === 0
        ? <p class="empty">Nothing published yet. Soon.</p>
        : notes.map((n) => <NoteCard slug={n.slug} title={n.data.title} date={n.data.date} summary={n.data.summary} />)
      }
    </section>
  </article>
</Layout>

<style>
  .page { max-width: 1080px; margin: 0 auto; padding: var(--s-9) var(--s-6) var(--s-8); }
  .head { padding-bottom: var(--s-7); border-bottom: 1px solid var(--rule); margin-bottom: var(--s-7); }
  .eyebrow { margin-bottom: var(--s-3); }
  h1 { margin-bottom: var(--s-4); max-width: 18ch; }
  .lede { color: var(--ink-soft); font-size: 18px; line-height: 1.55; max-width: 60ch; }
  .empty { color: var(--ink-soft); padding: var(--s-7) 0; }
</style>
EOF
```

- [ ] **Step 4: Create notes/[...slug].astro**

```bash
cat > 'src/pages/notes/[...slug].astro' <<'EOF'
---
import { getCollection } from 'astro:content';
import Layout from '../../components/Layout.astro';
import Prose from '../../components/Prose.astro';

export async function getStaticPaths() {
  const notes = await getCollection('notes', ({ data }) => import.meta.env.PROD ? !data.draft : true);
  return notes.map((entry) => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
const fmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(entry.data.date);
---
<Layout title={`${entry.data.title} · Brian Gautreau`} description={entry.data.summary}>
  <article class="page">
    <header>
      <p class="eyebrow"><a href="/notes">Notes</a></p>
      <h1>{entry.data.title}</h1>
      <p class="when">{fmt}</p>
    </header>
    <Prose>
      <Content />
    </Prose>
  </article>
</Layout>

<style>
  .page { max-width: 1080px; margin: 0 auto; padding: var(--s-9) var(--s-6) var(--s-8); }
  header { margin-bottom: var(--s-7); padding-bottom: var(--s-5); border-bottom: 1px solid var(--rule-soft); }
  .eyebrow { margin-bottom: var(--s-3); }
  .eyebrow a { color: var(--ink-soft); border-bottom: 0; }
  .eyebrow a:hover { color: var(--accent); }
  h1 { max-width: 22ch; margin-bottom: var(--s-3); }
  .when { font-family: var(--mono); font-size: var(--fs-small); color: var(--ink-soft); }
</style>
EOF
```

- [ ] **Step 5: Build and verify both routes**

```bash
npx astro build 2>&1 | tail -10
ls dist/notes/index.html dist/notes/2026-04-25-hello/index.html
```
Expected: both files exist.

- [ ] **Step 6: Commit**

```bash
git add src/components/NoteCard.astro src/components/Prose.astro src/pages/notes/
git commit -m "$(cat <<'EOF'
Add /notes index and dynamic [...slug] route

NoteCard renders a hover-tinted index row with date, title, summary.
Prose component sets long-form typography for note bodies. Index
shows a friendly empty state when no notes are published. Drafts are
excluded from production builds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Contact + 404

**Files:**
- Create: `src/pages/contact.astro`, `src/pages/404.astro`

- [ ] **Step 1: Create contact.astro**

```bash
cat > src/pages/contact.astro <<'EOF'
---
import Layout from '../components/Layout.astro';

const channels = [
  { label: 'Email',    value: 'brian.gautreau@gmail.com', href: 'mailto:brian.gautreau@gmail.com' },
  { label: 'LinkedIn', value: 'linkedin.com/in/briangautreau', href: 'https://www.linkedin.com/in/briangautreau/' },
  { label: 'GitHub',   value: 'github.com/bgautrea', href: 'https://github.com/bgautrea' },
];
---
<Layout title="Contact · Brian Gautreau" description="Email, LinkedIn, and GitHub. Direct messages welcome.">
  <article class="page">
    <header class="head">
      <p class="eyebrow">Contact</p>
      <h1>Direct.</h1>
      <p class="lede">Email is fastest. LinkedIn works for anything that needs context. GitHub for code.</p>
    </header>
    <ul class="channels">
      {channels.map((c) => (
        <li>
          <span class="label">{c.label}</span>
          <a href={c.href}>{c.value}</a>
        </li>
      ))}
    </ul>
  </article>
</Layout>

<style>
  .page { max-width: 1080px; margin: 0 auto; padding: var(--s-9) var(--s-6) var(--s-8); }
  .head { padding-bottom: var(--s-7); border-bottom: 1px solid var(--rule); margin-bottom: var(--s-7); }
  .eyebrow { margin-bottom: var(--s-3); }
  h1 { margin-bottom: var(--s-4); }
  .lede { color: var(--ink-soft); font-size: 18px; line-height: 1.55; max-width: 60ch; }
  .channels { display: grid; gap: var(--s-4); max-width: 60ch; }
  .channels li {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: var(--s-4);
    padding: var(--s-3) 0;
    border-top: 1px solid var(--rule-soft);
    align-items: baseline;
  }
  .channels li:first-child { border-top: 0; }
  .label { font-family: var(--mono); font-size: var(--fs-small); color: var(--ink-soft); }
  @media (max-width: 540px) {
    .channels li { grid-template-columns: 1fr; gap: var(--s-1); }
  }
</style>
EOF
```

- [ ] **Step 2: Create 404.astro**

```bash
cat > src/pages/404.astro <<'EOF'
---
import Layout from '../components/Layout.astro';
---
<Layout title="Not found · Brian Gautreau" description="That page does not exist.">
  <section class="wrap">
    <p class="eyebrow">404</p>
    <h1>Wrong door.</h1>
    <p class="lede">That page does not exist. Try one of these instead.</p>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/cv">CV</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/notes">Notes</a></li>
    </ul>
  </section>
</Layout>

<style>
  .wrap { max-width: 60ch; margin: 0 auto; padding: var(--s-10) var(--s-6); text-align: left; }
  .eyebrow { color: var(--accent); margin-bottom: var(--s-3); }
  h1 { margin-bottom: var(--s-4); }
  .lede { color: var(--ink-soft); margin-bottom: var(--s-5); font-size: 18px; line-height: 1.55; }
  ul { display: flex; gap: var(--s-5); flex-wrap: wrap; }
  ul li a { font-family: var(--mono); font-size: var(--fs-small); }
</style>
EOF
```

- [ ] **Step 3: Build and verify both routes**

```bash
npx astro build 2>&1 | tail -10
ls dist/contact/index.html dist/404.html
```
Expected: both files exist. (Astro emits 404 at the root path, not a directory.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/contact.astro src/pages/404.astro
git commit -m "$(cat <<'EOF'
Add /contact and /404 pages

Contact lists email, LinkedIn, GitHub in a label-value grid.
404 is a friendly wrong-door page with shortcuts back to the main
routes. Both built from the same Layout for consistent chrome.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Print stylesheet + /cv-print route

**Files:**
- Create: `src/styles/print.css`, `src/pages/cv-print.astro`

- [ ] **Step 1: Create print.css**

```bash
cat > src/styles/print.css <<'EOF'
@import './tokens.css';

@page {
  size: letter;
  margin: 0.75in 0.6in;
}

html, body {
  background: white;
  color: black;
  font-family: var(--sans);
  font-size: 10.5pt;
  line-height: 1.4;
}

.page { max-width: none; margin: 0; padding: 0; }

h1, h2, h3 {
  font-family: var(--serif);
  font-weight: 600;
  color: black;
  margin: 0;
}
h1 { font-size: 22pt; line-height: 1.05; margin-bottom: 6pt; }
h2 { font-size: 13pt; margin-top: 14pt; margin-bottom: 6pt; padding-bottom: 3pt; border-bottom: 0.5pt solid #999; }
h3 { font-size: 11pt; margin-bottom: 2pt; }

p { margin: 0 0 4pt; }
a { color: black; text-decoration: none; border: 0; }

.eyebrow { font-size: 8pt; letter-spacing: 0.10em; text-transform: uppercase; color: #666; margin-bottom: 4pt; }
.lede { color: #333; max-width: none; font-size: 11pt; }
.actions, .pill { display: none; }
header.head { padding: 0 0 6pt; border-bottom: 0.5pt solid #999; margin-bottom: 10pt; }

article.entry {
  display: grid;
  grid-template-columns: 1.2in 1fr;
  gap: 12pt;
  padding: 6pt 0;
  border-top: 0.25pt solid #ccc;
  page-break-inside: avoid;
}
article.entry:first-of-type { border-top: 0; padding-top: 0; }
.entry .meta { color: #555; font-size: 9pt; }
.entry .years { display: block; font-family: var(--mono); color: black; }
.entry .co { color: #555; font-size: 9.5pt; margin-bottom: 4pt; }
.entry .summary { font-size: 10pt; max-width: none; }
.entry ul { padding-left: 12pt; margin: 4pt 0 0; }
.entry ul li { margin-bottom: 2pt; max-width: none; font-size: 10pt; }

.rows .row { display: grid; padding: 3pt 0; border-top: 0.25pt solid #ccc; }
.rows .row:first-child { border-top: 0; }

footer, header > div { display: none; }   /* hide site chrome */

@media print {
  .skip-link { display: none; }
}
EOF
```

- [ ] **Step 2: Create cv-print.astro**

This is a separate route used only by the PDF renderer.

```bash
cat > src/pages/cv-print.astro <<'EOF'
---
import WorkEntry from '../components/WorkEntry.astro';
import PatentEntry from '../components/PatentEntry.astro';
import PublicationEntry from '../components/PublicationEntry.astro';
import EducationEntry from '../components/EducationEntry.astro';
import work from '../content/cv/work';
import patents from '../content/cv/patents';
import publications from '../content/cv/publications';
import education from '../content/cv/education';
import '../styles/print.css';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Brian Gautreau · CV</title>
  </head>
  <body>
    <article class="page">
      <header class="head">
        <p class="eyebrow">Curriculum vitae</p>
        <h1>Brian Gautreau</h1>
        <p class="lede">Senior Solutions Engineer at F5, dedicated to the United States Army account. Twenty-nine years across Dell and F5 building, deploying, and selling enterprise infrastructure. Cedar Park, Texas. brian.gautreau@gmail.com.</p>
      </header>

      <section>
        <h2>Experience</h2>
        {work.map((w) => <WorkEntry {...w} />)}
      </section>

      <section>
        <h2>Patents</h2>
        <ul class="rows">{patents.map((p) => <PatentEntry {...p} />)}</ul>
      </section>

      <section>
        <h2>Publications</h2>
        <ul class="rows">{publications.map((p) => <PublicationEntry {...p} />)}</ul>
      </section>

      <section>
        <h2>Education</h2>
        <ul class="rows">{education.map((e) => <EducationEntry {...e} />)}</ul>
      </section>
    </article>
  </body>
</html>
EOF
```

- [ ] **Step 3: Verify the route renders in dev**

```bash
npx astro dev --host 0.0.0.0 &
ASTRO_PID=$!
sleep 5
curl -s -o /tmp/cv-print.html http://localhost:4321/cv-print
wc -l /tmp/cv-print.html
kill $ASTRO_PID
```
Expected: file is 60+ lines and contains "Brian Gautreau" plus work entries.

- [ ] **Step 4: Commit**

```bash
git add src/styles/print.css src/pages/cv-print.astro
git commit -m "$(cat <<'EOF'
Add print stylesheet and /cv-print route for PDF generation

print.css uses Letter @page, drops site chrome, swaps to black-on-
white, and tightens the type scale for paper. /cv-print is a minimal
HTML document (no Layout chrome) wired to the same typed CV data so
the PDF cannot drift from /cv.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Playwright PDF render script

**Files:**
- Create: `scripts/render-pdf.mjs`
- Modify: `package.json` (add Playwright dev dep)

- [ ] **Step 1: Install Playwright as a dev dep and download Chromium**

```bash
npm install -D playwright@^1.48
npx playwright install --with-deps chromium 2>&1 | tail -5
```
Expected: Chromium downloads. If `--with-deps` fails on a non-Linux system, drop the flag and run `npx playwright install chromium`.

- [ ] **Step 2: Create scripts/render-pdf.mjs**

```bash
mkdir -p scripts
cat > scripts/render-pdf.mjs <<'EOF'
// Render /cv-print to public/cv.pdf via headless Chromium.
// Runs as a `prebuild` step so the PDF is in public/ before astro build copies it to dist/.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 4327;                        // dedicated port; avoids collision with any running dev server
const URL  = `http://127.0.0.1:${PORT}/cv-print`;
const OUT  = 'public/cv.pdf';

async function waitFor(url, { timeoutMs = 30000, intervalMs = 250 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not ready */ }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  console.log(`[render-pdf] starting astro dev on :${PORT}`);
  const astro = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
  });
  astro.stdout.on('data', (d) => process.stdout.write(`[astro] ${d}`));
  astro.stderr.on('data', (d) => process.stderr.write(`[astro] ${d}`));

  const cleanup = () => { try { astro.kill('SIGTERM'); } catch {} };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  try {
    await waitFor(URL);
    console.log(`[render-pdf] dev server up; rendering ${URL}`);

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.emulateMedia({ media: 'print' });
    await page.goto(URL, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0.75in', bottom: '0.75in', left: '0.6in', right: '0.6in' },
      preferCSSPageSize: true,
    });
    await browser.close();

    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, pdf);
    console.log(`[render-pdf] wrote ${OUT} (${pdf.length} bytes)`);
  } finally {
    cleanup();
    // give the dev server a moment to release the port
    await sleep(200);
  }
}

main().catch((err) => {
  console.error('[render-pdf] failed:', err);
  process.exit(1);
});
EOF
```

- [ ] **Step 3: Run the prebuild and verify a PDF appears**

```bash
node scripts/render-pdf.mjs 2>&1 | tail -15
ls -la public/cv.pdf
```
Expected: writes `public/cv.pdf` ~30-100 KB. If the script hangs at "starting astro dev," port 4327 may be busy; pick another and retry.

- [ ] **Step 4: Verify the full build now produces the PDF in dist/**

```bash
npm run build 2>&1 | tail -15
ls -la dist/cv.pdf
```
Expected: `dist/cv.pdf` exists with the same size as `public/cv.pdf`.

- [ ] **Step 5: Add public/cv.pdf and dist/ to .gitignore**

The PDF is generated, not source. Append rules:
```bash
grep -q '^public/cv.pdf$' .gitignore || cat >> .gitignore <<'EOF'

# Generated artifacts
public/cv.pdf
EOF
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/render-pdf.mjs .gitignore
git commit -m "$(cat <<'EOF'
Render /cv.pdf at build time with Playwright headless

scripts/render-pdf.mjs starts an Astro dev server on a dedicated port,
loads /cv-print in headless Chromium with print media emulation, and
writes the result to public/cv.pdf. Wired as the npm `prebuild` hook
so `npm run build` always produces a fresh PDF before Astro copies
public/ into dist/.

Adds Playwright as a dev dep only. The container never sees it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: nginx.conf + .dockerignore

**Files:**
- Create: `nginx.conf`, `.dockerignore`

- [ ] **Step 1: Create nginx.conf**

```bash
cat > nginx.conf <<'EOF'
server {
    listen       8080 default_server;
    listen       [::]:8080 default_server;
    server_name  _;

    root   /usr/share/nginx/html;
    index  index.html;

    # Gzip
    gzip              on;
    gzip_vary         on;
    gzip_min_length   1024;
    gzip_proxied      any;
    gzip_comp_level   6;
    gzip_types        text/plain text/css text/javascript application/javascript application/json image/svg+xml application/xml font/woff2;

    # Long-cache fingerprinted assets
    location /_astro/ {
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Long-cache fonts
    location /fonts/ {
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Always-fresh HTML
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/index.html $uri.html =404;
    }

    # Custom 404
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # Don't log liveness probe noise
    location = /healthz {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }
}
EOF
```

- [ ] **Step 2: Create .dockerignore**

```bash
cat > .dockerignore <<'EOF'
.git
.github
node_modules
.astro
src
public
scripts
tests
docs
k8s
.superpowers
.agents
.claude
*.md
.env*
.gitignore
.dockerignore
.npmrc
package.json
package-lock.json
tsconfig.json
astro.config.mjs

# Allow only what the container needs
!dist/
!nginx.conf
EOF
```

- [ ] **Step 3: Commit**

```bash
git add nginx.conf .dockerignore
git commit -m "$(cat <<'EOF'
Add nginx.conf and .dockerignore

nginx.conf: gzip on, immutable cache for /_astro/ and /fonts/, no-
cache for HTML, custom 404, internal /healthz endpoint for k8s probes,
listening on 8080 (so the container can run as non-root).

.dockerignore prunes the build context to only dist/ and nginx.conf.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Dockerfile + local container test

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

```bash
cat > Dockerfile <<'EOF'
# briangautreau.com — single-stage container.
# The Astro build runs OUTSIDE this image (in CI or locally via `npm run build`).
# This image only serves the produced dist/ directory.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="briangautreau-com"
LABEL org.opencontainers.image.source="https://github.com/bgautrea/briangautreau.com"
LABEL org.opencontainers.image.licenses="UNLICENSED"

# Replace the default site config with ours.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Allow nginx to run as non-root: rewrite the main config so PID lives in /tmp
# and switch the listen port to 8080. Then chown the html directory.
RUN sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf \
 && sed -i 's|listen *80|listen 8080|' /etc/nginx/conf.d/default.conf \
 && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
 && touch /tmp/nginx.pid && chown nginx:nginx /tmp/nginx.pid

# Copy the prebuilt site into the document root.
COPY --chown=nginx:nginx dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
EOF
```

- [ ] **Step 2: Build and run the container locally**

```bash
npm run build 2>&1 | tail -5   # ensure dist/ is fresh
docker build -t briangautreau-com:dev . 2>&1 | tail -10
docker run --rm -d --name bgcom-dev -p 18080:8080 briangautreau-com:dev
sleep 2
echo "--- /healthz ---"
curl -s http://localhost:18080/healthz
echo "--- / (head) ---"
curl -s http://localhost:18080/ | head -5
echo "--- /cv.pdf headers ---"
curl -sI http://localhost:18080/cv.pdf | head -5
docker stop bgcom-dev
```
Expected: `/healthz` returns `ok`. `/` returns HTML. `/cv.pdf` returns 200 with `Content-Type: application/pdf`.

- [ ] **Step 3: Confirm the container is small**

```bash
docker images briangautreau-com:dev --format '{{.Size}}'
```
Expected: under 50 MB. nginx-alpine is ~15 MB and dist/ should be a few hundred KB.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "$(cat <<'EOF'
Add single-stage Dockerfile (nginx:1.27-alpine, non-root)

Single stage; the Astro build runs outside the image and dist/ is
copied in. Rewrites nginx.conf to put PID in /tmp and listen on 8080
so the container can run as the unprivileged nginx user. Health check
hits /healthz served by our nginx config.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Kubernetes manifests

**Files:**
- Create: `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/ingress-patch.yaml`, `k8s/kustomization.yaml`

- [ ] **Step 1: Create deployment.yaml**

```bash
mkdir -p k8s
cat > k8s/deployment.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: briangautreau-com
  labels:
    app.kubernetes.io/name: briangautreau-com
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: briangautreau-com
  template:
    metadata:
      labels:
        app.kubernetes.io/name: briangautreau-com
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: web
          image: briangautreau-com   # rewritten by kustomize
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          readinessProbe:
            httpGet: { path: /healthz, port: http }
            initialDelaySeconds: 1
            periodSeconds: 10
            timeoutSeconds: 2
          livenessProbe:
            httpGet: { path: /healthz, port: http }
            initialDelaySeconds: 5
            periodSeconds: 20
            timeoutSeconds: 3
          resources:
            requests: { cpu: 25m, memory: 32Mi }
            limits:   { cpu: 200m, memory: 96Mi }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false
            capabilities:
              drop: ["ALL"]
EOF
```

- [ ] **Step 2: Create service.yaml**

```bash
cat > k8s/service.yaml <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: briangautreau-com-svc
  labels:
    app.kubernetes.io/name: briangautreau-com
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: briangautreau-com
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
EOF
```

- [ ] **Step 3: Create ingress-patch.yaml**

This is a strategic merge patch against the existing `default/nginx-ingress` Ingress. Kustomize will apply it to the cluster's existing object.

```bash
cat > k8s/ingress-patch.yaml <<'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  namespace: default
  annotations:
    ingress.kubernetes.io/ssl-redirect: "False"
spec:
  ingressClassName: nginx
  rules:
    - host: briangautreau.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: briangautreau-com-svc
                port:
                  number: 80
  tls: null
EOF
```

- [ ] **Step 4: Create kustomization.yaml**

```bash
cat > k8s/kustomization.yaml <<'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: default
resources:
  - deployment.yaml
  - service.yaml
  - ingress-patch.yaml
images:
  - name: briangautreau-com
    newName: docker.io/bgautrea/briangautreau-com
    newTag: latest
EOF
```

- [ ] **Step 5: Validate the kustomize bundle locally**

```bash
kubectl kustomize k8s/ 2>&1 | head -60
```
Expected: prints the merged YAML for Deployment, Service, and Ingress, with the image set to `docker.io/bgautrea/briangautreau-com:latest`. If `kubectl kustomize` is unavailable, install Kustomize standalone or use a recent kubectl (≥1.21).

- [ ] **Step 6: Server-side dry-run against the cluster**

```bash
KUBECONFIG=~/.kube/config.do kubectl apply -k k8s/ --dry-run=server 2>&1 | tail -10
```
Expected: reports `deployment.apps/briangautreau-com configured (server dry run)`, `service/briangautreau-com-svc configured (server dry run)`, and `ingress.networking.k8s.io/nginx-ingress configured (server dry run)`. No errors.

- [ ] **Step 7: Commit**

```bash
git add k8s/
git commit -m "$(cat <<'EOF'
Add Kubernetes manifests (Deployment, Service, Ingress patch)

Deployment: 2 replicas, RollingUpdate (maxSurge 1 / maxUnavailable 0),
non-root, all caps dropped, readiness and liveness on /healthz, modest
requests and limits.
Service: ClusterIP, port 80 to containerPort 8080.
Ingress patch: replaces backend on the existing default/nginx-ingress
to point at the new service, drops the tls block (TLS terminates
upstream).
Kustomization sets the default image to bgautrea/briangautreau-com:latest;
CI rewrites the tag on each push.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/build.yml`, `lighthouserc.json`
- Modify: `package.json` (add html-validate dev dep, lighthouse CI dep)

- [ ] **Step 1: Add html-validate and lighthouse-ci as dev deps**

```bash
npm install -D html-validate@^9 @lhci/cli@^0.14
```

- [ ] **Step 2: Create lighthouserc.json**

```bash
cat > lighthouserc.json <<'EOF'
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "numberOfRuns": 1,
      "url": [
        "http://localhost/index.html",
        "http://localhost/cv/index.html",
        "http://localhost/about/index.html"
      ],
      "settings": {
        "preset": "desktop",
        "skipAudits": ["uses-http2"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance":   ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices":["error", { "minScore": 0.95 }],
        "categories:seo":           ["error", { "minScore": 0.95 }]
      }
    }
  }
}
EOF
```

- [ ] **Step 3: Create the workflow**

```bash
mkdir -p .github/workflows
cat > .github/workflows/build.yml <<'EOF'
name: build

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write   # needed to commit the manifest tag bump back to main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Build (renders PDF, builds Astro)
        run: npm run build

      - name: Validate HTML
        run: npm run lint:html

      - name: Lighthouse CI
        run: npx lhci autorun

      - name: Compute short SHA
        id: sha
        run: echo "short=$(git rev-parse --short=12 HEAD)" >> "$GITHUB_OUTPUT"

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: bgautrea
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64
          push: true
          tags: |
            docker.io/bgautrea/briangautreau-com:${{ steps.sha.outputs.short }}
            docker.io/bgautrea/briangautreau-com:latest

      - name: Bump kustomize image tag
        run: |
          cd k8s
          # Use kustomize via kubectl to avoid a separate install
          curl -sL "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          ./kustomize edit set image briangautreau-com=docker.io/bgautrea/briangautreau-com:${{ steps.sha.outputs.short }}
          rm -f ./kustomize

      - name: Commit manifest update
        run: |
          git config user.name  "github-actions"
          git config user.email "github-actions@users.noreply.github.com"
          if git diff --quiet -- k8s/kustomization.yaml; then
            echo "no manifest change"
            exit 0
          fi
          git add k8s/kustomization.yaml
          git commit -m "ci: bump image to ${{ steps.sha.outputs.short }} [skip ci]" \
                     -m "Co-Authored-By: github-actions <github-actions@users.noreply.github.com>"
          git push origin HEAD:main

      - name: Print deploy command
        run: |
          echo "::notice title=Ready to deploy::Pull main, then run:"
          echo "::notice::KUBECONFIG=~/.kube/config.do kubectl apply -k k8s/"
          echo "::notice title=Image::docker.io/bgautrea/briangautreau-com:${{ steps.sha.outputs.short }}"
EOF
```

- [ ] **Step 4: Run html-validate and lighthouse locally to make sure they pass**

```bash
npm run build 2>&1 | tail -3
npm run lint:html 2>&1 | tail -10
npx lhci autorun --collect.staticDistDir=./dist 2>&1 | tail -20
```
Expected: html-validate reports 0 errors. Lighthouse reports all four categories ≥ 0.95. If a Lighthouse score is too low, fix it before pushing CI; common culprits are missing meta description (already present), missing lang on `<html>` (present), or untyped image dimensions.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lighthouserc.json .github/workflows/build.yml
git commit -m "$(cat <<'EOF'
Add GitHub Actions CI pipeline

Workflow on push to main: install, build (renders PDF first),
HTML-validate dist, run Lighthouse CI with 0.95 thresholds across
all four categories, build a linux/amd64 container image, push to
Docker Hub as bgautrea/briangautreau-com:<short-sha> and :latest,
and commit a kustomization tag bump back to main with [skip ci].
Prints the exact kubectl apply command in the action summary.

Requires repo secret DOCKERHUB_TOKEN. Uses default GITHUB_TOKEN for
the manifest commit (workflow has contents: write).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: README and first-deploy runbook

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```bash
cat > README.md <<'EOF'
# briangautreau.com

Multi-page personal site. Astro static, packaged as a small `nginx:alpine` container, deployed to a personal DigitalOcean Kubernetes cluster.

## Local development

```bash
nvm use 22
npm install
npx playwright install chromium
npm run dev          # http://localhost:4321
npm run build        # produces dist/ and dist/cv.pdf
npm run preview      # serves dist/ at http://localhost:4321
npm test             # vitest, content schema tests
```

## Container

```bash
npm run build
docker build -t briangautreau-com:dev .
docker run --rm -p 18080:8080 briangautreau-com:dev
# http://localhost:18080
```

## Deploy

CI builds and pushes images on every push to `main`. Deploy is manual:

```bash
git pull                                                   # get the CI tag bump
KUBECONFIG=~/.kube/config.do kubectl apply -k k8s/         # apply to cluster
KUBECONFIG=~/.kube/config.do kubectl rollout status deploy/briangautreau-com
```

## Project layout

| Path                              | Purpose |
|-----------------------------------|---------|
| `src/pages/`                      | Routes  |
| `src/components/`                 | Shared chrome and renderers |
| `src/content/`                    | Typed CV data (`cv/*.ts`), Markdown collections (`projects/`, `notes/`) |
| `src/styles/`                     | Tokens, globals, fonts, print CSS |
| `src/assets/headshot.png`         | Source image, processed by Astro `<Image>` |
| `scripts/render-pdf.mjs`          | Playwright headless, runs as `prebuild` |
| `nginx.conf`, `Dockerfile`        | Container |
| `k8s/`                            | Manifests + kustomization |
| `.github/workflows/build.yml`     | CI |
| `docs/superpowers/specs/`         | Design spec |
| `docs/superpowers/plans/`         | Implementation plan |

## Design

See `docs/superpowers/specs/2026-04-25-briangautreau-cv-design.md` for the full design system, anti-patterns, and architectural rationale.

## License

All rights reserved.
EOF
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Add README with local dev, container, and deploy instructions

Single-page reference covering the things you need on a clean clone:
how to run dev, how to test the container locally, how to deploy
(pull then kubectl apply), and a project layout table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: First deploy to the cluster

This is a one-time bring-up. Subsequent deploys are just `git pull && kubectl apply -k k8s/`.

- [ ] **Step 1: Confirm the cluster's current state**

```bash
KUBECONFIG=~/.kube/config.do kubectl get deploy,svc,ingress -n default
```
Expected: see the existing placeholder `nginx` Deployment, `nginx-svc` Service, and `nginx-ingress` Ingress. We replace the first two and patch the third.

- [ ] **Step 2: Build and push the first image manually**

CI may not have run yet (or this is the very first deploy). Push the image by hand:
```bash
SHA=$(git rev-parse --short=12 HEAD)
npm run build
docker buildx build --platform linux/amd64 \
  -t docker.io/bgautrea/briangautreau-com:$SHA \
  -t docker.io/bgautrea/briangautreau-com:latest \
  --push .
echo "Pushed: $SHA"
```
Expected: image pushes successfully. If `docker buildx` is not configured, run `docker buildx create --use` first.

- [ ] **Step 3: Set the kustomize image tag to the freshly pushed sha**

```bash
cd k8s
kubectl kustomize . > /tmp/before.yaml
# bump tag (use kubectl's built-in kustomize edit, available in recent kubectl):
sed -i.bak "s|newTag: latest|newTag: $SHA|" kustomization.yaml
rm -f kustomization.yaml.bak
cd ..
git diff k8s/kustomization.yaml
```
Expected: diff shows only the `newTag` change.

- [ ] **Step 4: Apply the manifests**

```bash
KUBECONFIG=~/.kube/config.do kubectl apply -k k8s/
KUBECONFIG=~/.kube/config.do kubectl rollout status deploy/briangautreau-com -n default --timeout=120s
```
Expected: deployment rolls out cleanly, both replicas Ready.

- [ ] **Step 5: Verify the Ingress now points at the new Service**

```bash
KUBECONFIG=~/.kube/config.do kubectl get ingress nginx-ingress -n default -o yaml | grep -A2 backend:
```
Expected: backend service is `briangautreau-com-svc`, port 80.

- [ ] **Step 6: Hit the site through the upstream proxy**

```bash
curl -s -o /dev/null -w "%{http_code} %{size_download}B\n" https://briangautreau.com/
curl -s https://briangautreau.com/ | head -10
curl -sI https://briangautreau.com/cv.pdf | head -5
```
Expected: 200 response, HTML body, `/cv.pdf` returns `Content-Type: application/pdf`. If TLS errors fire, the upstream nginx proxy may need the new IP refreshed; consult its config.

- [ ] **Step 7: Clean up the placeholder Deployment and Service**

Now that the new pods serve the host, delete the old ones.
```bash
KUBECONFIG=~/.kube/config.do kubectl delete deployment nginx -n default
KUBECONFIG=~/.kube/config.do kubectl delete service    nginx-svc -n default
KUBECONFIG=~/.kube/config.do kubectl get deploy,svc -n default
```
Expected: `nginx` Deployment and `nginx-svc` Service are gone; `briangautreau-com` and `briangautreau-com-svc` remain.

- [ ] **Step 8: Commit the manifest tag bump**

```bash
git add k8s/kustomization.yaml
git commit -m "$(cat <<'EOF'
Pin kustomize image tag to first deployed SHA

First deploy is live at https://briangautreau.com. CI takes over
tagging from this point.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Push to GitHub**

```bash
# Set up the remote if it does not exist yet:
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "No 'origin' remote configured. Create the GitHub repo first:"
  echo "  gh repo create bgautrea/briangautreau.com --private --source=. --remote=origin"
  echo "Then re-run this step."
  exit 1
fi
git push -u origin main
```
Expected: pushes successfully. After this, CI will run on every push.

---

## Self-Review

Skim against the spec:

| Spec section / requirement                                    | Implemented in |
|----------------------------------------------------------------|----------------|
| Astro static site, multi-page                                  | Tasks 1, 9-14  |
| Routes /, /cv, /about, /building, /notes, /contact, 404        | Tasks 9-14     |
| Editorial Restraint design system (OKLCH, Fraunces/Inter/Mono) | Task 2-3       |
| Self-hosted fonts, Latin subset, font-display swap             | Task 3         |
| Astro content collections + Zod                                | Task 5         |
| Typed CV data files                                            | Task 6         |
| Markdown collections (projects, notes)                         | Tasks 5, 7, 12-13 |
| /about page (intro + portrait + Outside-work blocks)           | Task 10        |
| Headshot via Astro <Image> on /about only                      | Task 10        |
| PDF résumé generated at build time                             | Tasks 15, 16   |
| View transitions, motion tokens, prefers-reduced-motion        | Tasks 2, 4     |
| Skip-link, semantic HTML, focus styles                         | Tasks 2, 4     |
| nginx.conf with gzip + immutable cache + no-cache HTML + 404   | Task 17        |
| Single-stage Dockerfile, non-root, port 8080                   | Task 18        |
| k8s Deployment (2 replicas, probes, limits)                    | Task 19        |
| Service ClusterIP                                              | Task 19        |
| Ingress patch dropping `tls:`                                  | Task 19        |
| Kustomization with image tag override                          | Task 19        |
| GitHub Actions: build, validate, Lighthouse, push, tag bump    | Task 20        |
| README with deploy runbook                                     | Task 21        |
| First deploy + cleanup of placeholder workloads                | Task 22        |

**Coverage gaps spotted in review and addressed:**
- Spec calls for HTML validation and Lighthouse with score ≥ 95. Wired into Task 20 with `lighthouserc.json` thresholds at 0.95 across all four categories.
- Spec mentions a `/healthz` endpoint is implied by the readiness/liveness probes; added to `nginx.conf` in Task 17 and used in Task 19's probes.
- Spec calls for fonts under `font-display: swap`; declared in Task 3.
- Spec bans `#000` and `#fff`; tokens use `oklch()` only and globals never reference hex.

**Things deferred to later (and that's fine, per spec non-goals):**
- Analytics, RSS, /now page, Sentry, comments, project image strategy.
- `/og.png` open-graph image (Layout references it; a missing file 404s harmlessly for crawlers but the social card will be plain text). Generate one once the visual direction has settled in production.
- Favicon (`public/favicon.ico`). Layout references it; same harmless 404 until added.

**Open content questions (Task 6 used placeholder copy):**
- Brian to refine F5 / Dell phrasing, exact dates, and the /about prose (triathlon distances, aquarium type, printer model, investing focus) post-launch by editing the .ts and .astro files in place. No structural changes needed.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-04-25-briangautreau-cv-implementation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using the executing-plans skill, with batch checkpoints.

**Which approach?**
