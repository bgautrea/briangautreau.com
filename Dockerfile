# briangautreau.com - single-stage container.
# The Astro build runs OUTSIDE this image (in CI or locally via `npm run build`).
# This image only serves the produced dist/ directory.
FROM nginx:1.30-alpine3.23

LABEL org.opencontainers.image.title="briangautreau-com"
LABEL org.opencontainers.image.source="https://github.com/bgautrea/briangautreau.com"
LABEL org.opencontainers.image.licenses="UNLICENSED"

# Pull current Alpine package versions so each build picks up CVE fixes
# even when the base tag has not been republished yet.
RUN apk upgrade --no-cache

# Replace the default site config with ours.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Allow nginx to run as non-root: rewrite whichever pid directive ships with the
# base image (the path varies between minor versions: /var/run/nginx.pid vs /run/nginx.pid).
# (The site config already listens on 8080 via nginx.conf above.)
RUN sed -i -E 's|^pid .*;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
 && touch /tmp/nginx.pid && chown nginx:nginx /tmp/nginx.pid

# Copy the prebuilt site into the document root.
COPY --chown=nginx:nginx dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
