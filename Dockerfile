# briangautreau.com - single-stage container.
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
