const MAX_BODY_BYTES = 2048;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (body, status = 200, extra = {}) =>
  Response.json(body, { status, headers: { ...headers, ...extra } });

/** Server-only handler. Credentials are read at runtime and never enter dist/. */
export function createWhitelistHandler({
  env = process.env,
  fetcher = (...args) => fetch(...args),
  now = () => new Date(),
} = {}) {
  return async function handle(request) {
    if (request.method !== "POST")
      return json({ ok: false, error: "method_not_allowed" }, 405, {
        Allow: "POST",
      });
    const requestUrl = new URL(request.url);
    if (
      request.headers.get("origin") !== requestUrl.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return json({ ok: false, error: "forbidden" }, 403);
    if (
      !/^application\/json(?:;|$)/i.test(
        request.headers.get("content-type") || "",
      )
    )
      return json({ ok: false, error: "unsupported_media_type" }, 415);
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
      return json({ ok: false, error: "too_large" }, 413);
    let data;
    try {
      // Bound the stream as well as Content-Length, which is client-controlled.
      const reader = request.body?.getReader();
      if (!reader) return json({ ok: false, error: "invalid_request" }, 400);
      const parts = [];
      let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_BODY_BYTES) {
          await reader.cancel();
          return json({ ok: false, error: "too_large" }, 413);
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json({ ok: false, error: "invalid_request" }, 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      return json({ ok: false, error: "invalid_request" }, 400);
    if (data.website !== undefined && data.website !== "")
      return json({ ok: false, error: "invalid_request" }, 400);
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (
      email.length > 254 ||
      !EMAIL.test(email) ||
      data.consent !== true ||
      !["en", "es"].includes(data.language)
    )
      return json({ ok: false, error: "invalid_request" }, 400);
    const secret = env.SUPABASE_SECRET_KEY;
    let endpoint;
    try {
      const base = new URL(env.SUPABASE_URL);
      if (
        base.protocol !== "https:" ||
        base.username ||
        base.password ||
        base.pathname !== "/" ||
        base.search ||
        base.hash ||
        !secret?.startsWith("sb_secret_")
      )
        throw new Error("Missing server configuration");
      endpoint = new URL(
        "/rest/v1/movya_whitelist?on_conflict=email",
        base.origin,
      );
    } catch {
      return json({ ok: false, error: "unavailable" }, 503);
    }
    try {
      const saved = await fetcher(endpoint.href, {
        method: "POST",
        headers: {
          apikey: secret,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          email,
          language: data.language,
          consent_at: now().toISOString(),
          source: "landing",
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!saved.ok) return json({ ok: false, error: "unavailable" }, 503);
      // Existing and new emails receive the same result. No subscriber data is returned.
      return json({ ok: true });
    } catch {
      return json({ ok: false, error: "unavailable" }, 503);
    }
  };
}
