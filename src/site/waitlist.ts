import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).email();

/** A normalized email address, or null when it isn't one. */
export function parseEmail(value: unknown): string | null {
  const parsed = email.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Appends the address to a JSON-lines file unless it's already there. In production the file sits on a persistent
 * volume mounted at /app/data, the same path the earlier site used, so existing signups carry over.
 */
export async function addToWaitlist(file: string, address: string, now = new Date()): Promise<"added" | "exists"> {
  let existing = "";
  try {
    existing = await readFile(file, "utf8");
  } catch {
    await mkdir(dirname(file), { recursive: true });
  }
  if (existing.split("\n").some((line) => line.includes(`"email":${JSON.stringify(address)}`))) return "exists";
  await appendFile(file, `${JSON.stringify({ email: address, at: now.toISOString() })}\n`);
  return "added";
}

/** Fixed-window limiter kept in memory; enough for one web process. */
export class RateLimiter {
  private readonly hits = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count++;
    return entry.count <= this.limit;
  }
}

export interface WaitlistOptions {
  file?: string;
  limiter?: RateLimiter;
}

const defaultLimiter = new RateLimiter(5, 60_000);

/**
 * POST /api/waitlist. JSON bodies get JSON replies, for the enhanced form. A plain form post, sent when JavaScript is
 * off, gets a redirect back to the home page with the outcome in the query string.
 */
export async function handleWaitlist(req: Request, options: WaitlistOptions = {}): Promise<Response> {
  const file = options.file ?? process.env.WAITLIST_FILE ?? join(process.cwd(), "data", "waitlist.jsonl");
  const limiter = options.limiter ?? defaultLimiter;
  const isForm = (req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  const reply = (status: number, outcome: "joined" | "invalid" | "busy" | "error", message?: string) => {
    if (isForm) return new Response(null, { status: 303, headers: { Location: `/?waitlist=${outcome}#waitlist` } });
    return Response.json(message ? { error: message } : { ok: true }, { status });
  };

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!limiter.allow(ip)) return reply(429, "busy", "Too many attempts. Try again in a minute.");

  let body: { email?: unknown; website?: unknown };
  try {
    body = isForm ? Object.fromEntries(await req.formData()) : ((await req.json()) as typeof body);
  } catch {
    return reply(400, "invalid", "Send a JSON body with an email field.");
  }

  // Hidden field that people leave empty and bots fill in.
  if (typeof body.website === "string" && body.website.length > 0) return reply(200, "joined");

  const address = parseEmail(body.email);
  if (!address) return reply(400, "invalid", "Enter an email address like you@company.com.");

  try {
    await addToWaitlist(file, address);
  } catch (err) {
    console.error("waitlist write failed", err);
    return reply(503, "error", "Couldn't save your address right now. Try again later.");
  }
  return reply(200, "joined");
}
