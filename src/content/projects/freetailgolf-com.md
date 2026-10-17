---
title: freetailgolf.com
blurb: A marketing site for Freetail Golf, a nine-hole lighted par-3 course in Leander, Texas. React and Vite, deployed as a container to a personal Kubernetes cluster.
status: shipping
url: https://freetailgolf.com
stack: [React, Vite, CSS, Kubernetes, Docker, Flux]
order: 50
---

One long page: the course, night golf, leagues, pricing, membership, and how to get there.

The course section is the interactive part. A routing map, a hole detail card, and a scorecard strip are three views of one selection, so clicking a pin, a scorecard column, or the arrows all move together. Copy and course data live in plain data files, so a yardage change updates the scorecard and the totals at once.

Deployed to the same Kubernetes cluster, with Flux watching the image registry and rolling out new builds on its own.
