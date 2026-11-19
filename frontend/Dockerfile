# Multi-stage: build the static bundle, then serve it with a tiny nginx.
# VITE_* build args let the compose file bake in the right API base URL
# without needing a code change.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=""
ARG VITE_DEFAULT_UI_LANGUAGE="en"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_DEFAULT_UI_LANGUAGE=${VITE_DEFAULT_UI_LANGUAGE}
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
