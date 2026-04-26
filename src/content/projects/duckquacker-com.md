---
title: duckquacker.com
blurb: A satirical marketing site for *Quacker*, an entirely fictitious institutional RWA-crypto product. Astro, deployed as a container to a personal Kubernetes cluster.
status: shipping
repo: https://github.com/bgautrea/duckquacker.com
url: https://duckquacker.com
stack: [Astro, TypeScript, Zod, OKLCH, Kubernetes, Docker, GitHub Actions]
order: 20
---

A multi-page parody site. Marketing chrome, team bios, press releases, governance proposals (QIPs), quarterly attestations, and a full disclosures page making clear the whole thing is fiction.

The site is part of the demonstration. Static Astro builds into a small `nginx:alpine` image. Two replicas behind the cluster's `nginx.org` ingress controller. TLS terminates at an upstream nginx proxy that lives outside the cluster. CI builds and pushes the image; deploy is a single `kubectl apply` from a laptop. Content lives in typed collections — Zod schemas keep press, proposals, and attestations honest at build time.

Design language: cold institutional palette in OKLCH, a serif for display set against a clean sans for body, JetBrains Mono for tickers and tables. The visual joke is that it looks exactly like the bank-grade fintech sites it's parodying — restrained, monochrome, slightly humorless — until you read the words.
