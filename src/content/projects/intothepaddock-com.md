---
title: intothepaddock.com
blurb: An independent, educational guide to Formula 1 for newcomers and casual fans. Astro with live race data, deployed as a container to a personal Kubernetes cluster.
status: shipping
repo: https://github.com/bgautrea/intothepaddock
url: https://intothepaddock.com
stack: [Astro, MDX, TypeScript, D3, Caddy, Kubernetes, Docker, GitHub Actions]
order: 30
---

F1 for people who just started watching. Drivers, teams, the car, the race weekend, the rules, the tracks, and strategy, explained without assuming you already know.

Standings and the season schedule come live from the jolpica-f1 API, the community continuation of Ergast, with committed JSON snapshots as a fallback. A daily GitHub Actions job refreshes the snapshots and pushes to `main`, which triggers a redeploy.

Static Astro and MDX content, served by Caddy in a container on the same Kubernetes cluster as this site.
