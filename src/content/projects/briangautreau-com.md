---
title: briangautreau.com
blurb: This personal site. Built with Astro, deployed as a container to a personal Kubernetes cluster.
status: shipping
repo: https://github.com/bgautrea/briangautreau.com
url: https://briangautreau.com
stack: [Astro, TypeScript, OKLCH, Kubernetes, Docker, GitHub Actions]
order: 10
---

A multi-page personal site. CV, life outside work, side projects, notes. You are reading it now.

Static Astro, packaged as an `nginx:alpine` container, deployed to a personal Kubernetes cluster. CI builds and pushes the image; deploy is a single `kubectl apply` from a laptop.

Design language: warm cream surface in OKLCH, Fraunces serif for display, Inter for body, JetBrains Mono for the rare technical moment. A single sienna accent.
