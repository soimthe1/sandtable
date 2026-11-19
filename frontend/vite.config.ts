import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The DEV server only. None of this exists in production, where nginx serves
// a static built bundle and proxies /api inside the single container - one
// published port, chosen in docker-compose.prod.yaml.
//
// Two settings are environment-driven so the same config works whether Vite
// runs natively (VS Code) or inside the compose stack. Both are plain env
// vars, NOT VITE_ ones: they configure the dev server itself and must never
// be inlined into the browser bundle.
//
//   DEV_API_TARGET       where to proxy /api. Natively that is localhost:8000.
//                        Inside compose, `localhost` is the FRONTEND container,
//                        so it has to be the backend's service name instead.
//   DEV_HMR_CLIENT_PORT  the port the BROWSER can reach Vite on. Normally the
//                        same as server.port, but under Docker the published
//                        host port differs from the container port, and the
//                        HMR client connects from the browser - so it needs
//                        the outside number or live reload silently fails.
const devApiTarget = process.env.DEV_API_TARGET || "http://localhost:8000";
const hmrClientPort = process.env.DEV_HMR_CLIENT_PORT
  ? Number(process.env.DEV_HMR_CLIENT_PORT)
  : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // All env files live in ONE place: the repo root. Vite defaults envDir to
  // this config file's own directory, so it must be pointed at the root
  // or it would never see them.
  //
  // This only affects .env FILE discovery. Real environment variables still
  // win, which is what makes the Docker build work: the image build has no
  // .env to read, and VITE_* values arrive as --build-arg -> ENV
  // instead (see docker/Dockerfile and `scripts/dev.ps1 build`).
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  server: {
    port: 5173,
    // Proxy /api to the FastAPI backend so the frontend never needs to know
    // the backend's host during local development - the browser only ever
    // talks to Vite, on one port.
    proxy: {
      "/api": {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
    ...(hmrClientPort ? { hmr: { clientPort: hmrClientPort } } : {}),
  },
});
