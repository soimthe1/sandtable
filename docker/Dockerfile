# Single-image build: API + UI in one container, via nginx + supervisord.
#
# One image, one tar to build, save, load and track - rather than shipping
# the api and ui as two separate images.
#
# NOTE the build context is the REPO ROOT, not backend/ or frontend/, because
# this needs both trees:
#   docker build -f docker/Dockerfile -t sandtable:1.0.0 .
#
# The root .dockerignore keeps node_modules, dist, .venv and every config/.env*
# out of that context - a real .env.prod must never end up in an image layer.
# Production config arrives at RUN time through the config/ volume mount (see
# docker-compose.prod.yaml).

# ---------------------------------------------------------------------------
# Stage 1 - build the static frontend bundle
# ---------------------------------------------------------------------------
FROM node:20-slim AS ui

WORKDIR /ui
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./

# Vite inlines VITE_* at BUILD time, so these are build args rather than
# runtime env. vite.config.ts points envDir at the repo root, which holds no
# .env in this stage - that is fine and deliberate: a missing envDir is not
# an error, and real environment variables take precedence over .env files
# anyway, so the values below are what get compiled in. (Verified: the build
# succeeds with no config/ present and these values still reach the bundle.)
ARG VITE_API_BASE_URL=""
ARG VITE_DEFAULT_UI_LANGUAGE="en"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_DEFAULT_UI_LANGUAGE=${VITE_DEFAULT_UI_LANGUAGE}
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 - runtime: python + uvicorn behind nginx, both under supervisord
# ---------------------------------------------------------------------------
FROM python:3.12-slim

# WORKDIR must stay /app: backend/app/config.py reads /app/.env.prod,
# which is where docker-compose.prod.yaml mounts .env.prod.
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=ui /ui/dist /usr/share/nginx/html

# Overwrite Debian's default site rather than adding a second server block in
# conf.d - nginx.conf includes BOTH conf.d/*.conf and sites-enabled/*, so
# adding a file would leave two servers listening on port 80.
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/sandtable.conf

# Only nginx is published. uvicorn binds 127.0.0.1 inside the container (see
# supervisord.conf), so the API is reachable only through nginx at /api - it
# is not separately exposed.
EXPOSE 80

# -n is not optional: Debian's packaged /etc/supervisor/supervisord.conf does
# not set nodaemon, so without it supervisord would fork, PID 1 would exit,
# and the container would die immediately on start.
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
