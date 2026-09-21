FROM nginx:alpine

COPY . /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Only substitute BACKEND_URL; leave nginx's own $variables alone.
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL
# Default keeps the existing Dokploy deployment working with no extra config.
# docker-compose.yml overrides it with http://backend:3000 for local use.
ENV BACKEND_URL=http://iberoreservations-reservationsapi-6ulakn:3000

EXPOSE 80
