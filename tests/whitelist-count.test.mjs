import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { createWhitelistCountHandler } from "../server/whitelist-count-handler.js";
import { initWhitelistCount } from "../src/whitelist-count.js";
import { renderPage } from "../src/template.mjs";
import { content } from "../src/content.mjs";

const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_test_only" };
const request = method => new Request("https://movyawallet.com/api/whitelist-count", { method });

test("public count returns an exact total using HEAD without returning subscribers or credentials", async () => {
  for (const count of [0, 1, 6]) {
    const handle = createWhitelistCountHandler({ env, fetcher: async (url, options) => {
      assert.equal(url, "https://example.supabase.co/rest/v1/movya_whitelist?select=email&limit=0");
      assert.equal(options.method, "HEAD");
      assert.equal(options.headers.Prefer, "count=exact");
      assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
      return new Response(null, { headers: { "Content-Range": `*/${count}` } });
    } });
    const response = await handle(request("GET"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { count });
  }
});

test("count failures and missing configuration never become a fabricated zero", async () => {
  for (const value of [null, "*/*", "*/invalid", "*/-1", "*/999999999999999999999"]) {
    const handle = createWhitelistCountHandler({ env, fetcher: async () =>
      new Response(null, { headers: value ? { "Content-Range": value } : {} }) });
    const response = await handle(request("GET"));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "unavailable" });
  }
  for (const fetcher of [async () => new Response(null, { status: 401 }), async () => { throw Error("offline"); }]) {
    assert.equal((await createWhitelistCountHandler({ env, fetcher })(request("GET"))).status, 503);
  }
  for (const badEnv of [{}, { ...env, SUPABASE_URL: "https://user:password@example.supabase.co" }]) {
    const response = await createWhitelistCountHandler({ env: badEnv, fetcher: () => assert.fail("No request with invalid configuration") })(request("GET"));
    assert.equal(response.status, 503);
  }
  const response = await createWhitelistCountHandler({ env, fetcher: () => assert.fail("Read only") })(request("POST"));
  assert.equal(response.status, 405);
});

for (const lang of ["en", "es"]) {
  test(`${lang}: live total handles zero, singular and plural and refreshes after registration`, async () => {
    const { document, window } = parseHTML(renderPage(lang, { basePath: "/landing" }));
    const counter = document.querySelector("#whitelist-count");
    assert.equal(counter.hidden, true);
    assert.equal(document.querySelector(".visual-caption"), null);
    assert.ok(!document.documentElement.outerHTML.includes("Illustrative balances"));
    let count = 0;
    let calls = 0;
    await initWhitelistCount(document, async (url, options) => {
      assert.equal(url, "/landing/api/whitelist-count");
      assert.equal(options.cache, "no-store");
      calls++;
      return Response.json({ count });
    });
    for (const next of [0, 1, 6]) {
      count = next;
      document.dispatchEvent(new window.Event("whitelist:joined"));
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(counter.hidden, false);
      assert.equal(counter.querySelector("strong").textContent, String(next));
      assert.equal(counter.querySelector("[data-whitelist-count-label]").textContent,
        next === 1 ? content[lang].whitelist.countOne : content[lang].whitelist.countMany);
    }
    assert.equal(calls, 4);
  });
}

test("unavailable, malformed and out-of-order totals cannot display a false count", async () => {
  for (const response of [Response.json({ error: "unavailable" }, { status: 503 }), Response.json({ count: -1 }), Response.json({ count: "6" }), new Response("not JSON")]) {
    const { document } = parseHTML(renderPage("en"));
    await initWhitelistCount(document, async () => response);
    assert.equal(document.querySelector("#whitelist-count").hidden, true);
  }
  const { document, window } = parseHTML(renderPage("en"));
  const pending = [];
  const initial = initWhitelistCount(document, () => new Promise(resolve => pending.push(resolve)));
  document.dispatchEvent(new window.Event("whitelist:joined"));
  pending[1](Response.json({ count: 7 }));
  await new Promise(resolve => setTimeout(resolve, 0));
  pending[0](Response.json({ count: 6 }));
  await initial;
  assert.equal(document.querySelector("[data-whitelist-total]").textContent, "7");
});
