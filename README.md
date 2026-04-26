# briangautreau.com

Multi-page personal site. Astro static, packaged as a small `nginx:alpine` container, deployed to a personal DigitalOcean Kubernetes cluster.

## Local development

```bash
nvm use 22                    # or fnm use 22
npm install
npx playwright install chromium
sudo $(which npx) playwright install-deps chromium    # one-time, system libs for headless Chromium
npm run dev                   # http://localhost:4321
npm run build                 # produces dist/ and dist/cv.pdf
npm run preview               # serves dist/ at http://localhost:4321
npm test                      # vitest, content schema tests
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
