# neatlabs.design: marketing site, component library, and hosted MCP server.
FROM oven/bun:1.3.14-alpine
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build:css

ENV NODE_ENV=production
ENV PORT=3000
# Waitlist signups. Mount a persistent volume at /app/data.
ENV WAITLIST_FILE=/app/data/waitlist.jsonl

EXPOSE 3000
CMD ["bun", "src/site/server.tsx"]
