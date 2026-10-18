const json = (body, status = 200, extra = {}) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
});

/** Public aggregate only. Subscriber records and credentials stay on the server. */
export function createWhitelistCountHandler({
  env = process.env,
  fetcher = (...args) => fetch(...args),
} = {}) {
  return async function handle(request) {
    if (request.method !== "GET")
      return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
    try {
      const base = new URL(env.SUPABASE_URL);
      const secret = env.SUPABASE_SECRET_KEY;
      if (base.protocol !== "https:" || base.username || base.password ||
          base.pathname !== "/" || base.search || base.hash || !secret?.startsWith("sb_secret_"))
        throw new Error("Missing server configuration");
      const endpoint = new URL("/rest/v1/movya_whitelist?select=email&limit=0", base.origin);
      const response = await fetcher(endpoint.href, {
        method: "HEAD",
        headers: { apikey: secret, Prefer: "count=exact" },
        signal: AbortSignal.timeout(8000),
      });
      const match = response.headers.get("content-range")?.match(/\/(\d+)$/);
      const count = match ? Number(match[1]) : NaN;
      if (!response.ok || !Number.isSafeInteger(count) || count < 0)
        throw new Error("Count unavailable");
      return json({ count });
    } catch {
      return json({ error: "unavailable" }, 503);
    }
  };
}
