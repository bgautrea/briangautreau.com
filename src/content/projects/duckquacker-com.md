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

Same deployment shape as this site: static Astro into an `nginx:alpine` image, behind the cluster ingress, shipped by `kubectl apply`. Content lives in typed collections; Zod schemas keep press, proposals, and attestations honest at build time.

Design language: cold institutional palette in OKLCH, a serif for display against a clean sans for body, JetBrains Mono for tickers and tables. It looks exactly like the bank-grade fintech sites it parodies: restrained, monochrome, slightly humorless. The joke is the words.
