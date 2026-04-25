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
