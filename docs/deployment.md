# Deploying neatlabs.design

This repository serves neatlabs.design: the marketing site, the component library, and the hosted MCP server. The editor app that people sign in to is a separate, private application.

Not deployed yet. The steps below are the plan; each one is a production change.

## Container

`Dockerfile` builds a Bun image that runs `bun src/site/server.tsx` on port 3000.

| Setting | Value |
| --- | --- |
| Health check | `GET /api/health` (also `/health`) |
| Persistent volume | `/app/data`, which holds `waitlist.jsonl` |
| `PUBLIC_URL` | `https://neatlabs.design`, so preview links in MCP replies use the public origin behind the proxy |
| `WAITLIST_FILE` | Optional. Defaults to `/app/data/waitlist.jsonl` in the image |

The waitlist file is one JSON object per line: `{"email": "...", "at": "..."}`. Signups made on the earlier site are in the same format on that site's `/app/data` volume. Copy the file across, or attach the same volume, before this app takes the domain.

## Routes that must keep working

| Path | Why |
| --- | --- |
| `/api/mcp` | Existing MCP client configurations |
| `/api/sse` | Older connection instructions; serves the same endpoint |
| `/api/waitlist` | The waitlist form |
| `/api/health` | The platform health check |
| `/catalog`, `/flows`, `/scanner`, `/editor` | Pages from the earlier site; they redirect |

The image runs as root, like the earlier site, so it can write to a volume Coolify creates as root. To run as the `bun` user instead, make `/app/data` writable by uid 1000 first.
