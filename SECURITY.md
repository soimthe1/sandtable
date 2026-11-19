# Security

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
[security advisories](../../security/advisories/new) rather than a public issue.

## Deployment notes

Sandtable is designed for single-planner use on a trusted network:

- **No authentication.** Put it behind your own reverse proxy / SSO if more than one person can
  reach it.
- **Server-side URL fetch.** `POST /api/scenario/import-url` fetches a caller-supplied URL. Always set
  `scenario_url_allowed_hosts` in `config/config.prod.yaml` on an exposed deployment.
- **Export by URL** (`GET /api/export/coa/{session_id}/{coa_id}`) is unauthenticated and lives only
  as long as the in-memory session.
- **No TLS** in the image; terminate HTTPS at a reverse proxy.
- Secrets belong in `.env` / `.env.prod` only. The config loader refuses secret-looking keys in YAML,
  and anything prefixed `VITE_` is compiled into public JavaScript.
