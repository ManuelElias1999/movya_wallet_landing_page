import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { createWhitelistHandler } from "../server/whitelist-handler.js";
import { initWhitelist } from "../src/whitelist.js";
import { initMotion } from "../src/motion.js";
import { renderPage } from "../src/template.mjs";
import { content } from "../src/content.mjs";

const origin = "https://movyawallet.com";
const environment = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test_only",
};
const payload = {
  email: " Alex@Example.COM ",
  consent: true,
  language: "en",
  website: "",
};
const request = (data = payload, headers = {}, method = "POST") =>
  new Request(`${origin}/api/whitelist`, {
    method,
    headers: { origin, "content-type": "application/json", ...headers },
    ...(["GET", "HEAD"].includes(method)
      ? {}
      : { body: typeof data === "string" ? data : JSON.stringify(data) }),
  });

test("whitelist saves normalized email, consent and language using server-only credentials", async () => {
  let sent;
  const handler = createWhitelistHandler({
    env: environment,
    now: () => new Date("2026-10-15T22:00:00Z"),
    fetcher: async (url, options) => {
      sent = { url, options };
      return new Response(null, { status: 201 });
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(
    sent.url,
    "https://example.supabase.co/rest/v1/movya_whitelist?on_conflict=email",
  );
  assert.equal(sent.options.headers.apikey, environment.SUPABASE_SECRET_KEY);
  assert.ok(sent.options.headers.Prefer.includes("ignore-duplicates"));
  assert.deepEqual(JSON.parse(sent.options.body), {
    email: "alex@example.com",
    language: "en",
    consent_at: "2026-10-15T22:00:00.000Z",
    source: "landing",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("new and existing emails have identical results without exposing a subscriber record", async () => {
  for (const status of [200, 201, 204]) {
    const handler = createWhitelistHandler({
      env: environment,
      fetcher: async () => new Response(null, { status }),
    });
    assert.deepEqual(await (await handler(request())).json(), { ok: true });
  }
});
test("whitelist rejects invalid, unconsented, cross-origin, bot and oversized submissions before storage", async () => {
  let calls = 0;
  const handler = createWhitelistHandler({
    env: environment,
    fetcher: () => {
      calls++;
      throw Error("must not call storage");
    },
  });
  for (const data of [
    { ...payload, email: "not-an-email" },
    { ...payload, consent: false },
    { ...payload, consent: "true" },
    { ...payload, language: "de" },
    { ...payload, website: "bot" },
    { ...payload, email: "a".repeat(255) + "@example.com" },
    [],
    null,
    "{broken",
  ])
    assert.equal((await handler(request(data))).status, 400);
  assert.equal(
    (await handler(request(payload, { origin: "https://other.example" })))
      .status,
    403,
  );
  assert.equal(
    (await handler(request(payload, { "sec-fetch-site": "cross-site" })))
      .status,
    403,
  );
  assert.equal(
    (await handler(request(payload, { "content-type": "text/plain" }))).status,
    415,
  );
  assert.equal((await handler(request({}, {}, "GET"))).status, 405);
  assert.equal((await handler(request("x".repeat(2100)))).status, 413);
  assert.equal(
    (await handler(request(payload, { "content-length": "9999" }))).status,
    413,
  );
  assert.equal(calls, 0);
});
test("missing configuration and failed writes cannot return successful signup", async () => {
  for (const env of [
    {},
    { ...environment, SUPABASE_SECRET_KEY: "sb_publishable_not-a-server-key" },
    { ...environment, SUPABASE_URL: "http://example.supabase.co" },
  ]) {
    const handler = createWhitelistHandler({
      env,
      fetcher: () => {
        throw Error("unexpected request");
      },
    });
    const response = await handler(request());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  }
  for (const fetcher of [
    async () => new Response(null, { status: 500 }),
    async () => new Response(null, { status: 401 }),
    async () => {
      throw Error("network failure");
    },
  ]) {
    const response = await createWhitelistHandler({
      env: environment,
      fetcher,
    })(request());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  }
});
for (const lang of ["en", "es"])
  test(`${lang}: whitelist validates, retries failed saves and confirms only persisted signups`, async () => {
    const { window, document } = parseHTML(renderPage(lang));
    window.HTMLElement.prototype.focus = function () {
      document.__focused = this;
    };
    const copy = content[lang].whitelist;
    let calls = 0;
    let fulfill;
    const records = [];
    initWhitelist(document, (url, options) => {
      calls++;
      records.push({ url, options });
      return new Promise((resolve) => {
        fulfill = resolve;
      });
    });
    const form = document.querySelector("#whitelist-form");
    const email = document.querySelector("#whitelist-email");
    const consent = document.querySelector("#whitelist-consent");
    const status = document.querySelector("#whitelist-status");
    const success = document.querySelector("#whitelist-success");
    const submit = () =>
      form.dispatchEvent(new window.Event("submit", { cancelable: true }));
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    submit();
    assert.equal(status.textContent, copy.invalid);
    assert.equal(calls, 0);
    email.value = "test@example.com";
    consent.checked = false;
    submit();
    assert.equal(status.textContent, copy.consentError);
    assert.equal(calls, 0);
    consent.checked = true;
    submit();
    submit();
    assert.equal(calls, 1, "Double-submit is prevented");
    assert.equal(form.getAttribute("aria-busy"), "true");
    assert.equal(success.hidden, true);
    fulfill(new Response(JSON.stringify({ ok: false }), { status: 503 }));
    await settle();
    assert.equal(status.textContent, copy.unavailable);
    assert.equal(success.hidden, true);
    assert.equal(email.value, "test@example.com");
    submit();
    assert.equal(calls, 2);
    fulfill(
      new Response("<html>Unexpected hosting fallback</html>", { status: 200 }),
    );
    await settle();
    assert.equal(success.hidden, true);
    assert.equal(status.textContent, copy.error);
    submit();
    fulfill(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await settle();
    assert.equal(success.hidden, false);
    assert.equal(form.hidden, true);
    assert.equal(email.value, "");
    assert.deepEqual(JSON.parse(records[0].options.body), {
      email: "test@example.com",
      consent: true,
      language: lang,
      website: "",
    });
    assert.equal(records[0].url, "/api/whitelist");
    assert.equal(records[0].options.method, "POST");
    assert.equal(document.querySelector('footer a[href*="github"]'), null);
    assert.ok(!document.body.textContent.includes("Wallet source"));
  });
test("motion uses reveal observers and active navigation while honoring reduced motion and no-JS fallback", () => {
  for (const reduced of [false, true]) {
    const { window, document } = parseHTML(renderPage("en"));
    assert.equal(
      document.querySelector(".reveal-ready"),
      null,
      "Static HTML stays visible without JavaScript",
    );
    const observers = [];
    window.matchMedia = () => ({ matches: reduced });
    window.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.targets = [];
        observers.push(this);
      }
      observe(target) {
        this.targets.push(target);
      }
      unobserve(target) {
        this.targets = this.targets.filter((t) => t !== target);
      }
    };
    window.scrollY = 50;
    window.innerHeight = 800;
    initMotion(document, window);
    assert.equal(
      document.querySelector(".site-header").classList.contains("is-scrolled"),
      true,
    );
    observers[0].callback([
      { isIntersecting: true, target: document.querySelector("#whitelist") },
    ]);
    assert.ok(
      document
        .querySelector('#main-nav a[href="#whitelist"]')
        .classList.contains("is-active"),
    );
    if (reduced) assert.equal(document.querySelector(".reveal-ready"), null);
    else {
      const element = document.querySelector(".reveal-ready");
      assert.ok(element);
      observers[1].callback([{ isIntersecting: true, target: element }]);
      assert.ok(element.classList.contains("is-revealed"));
    }
  }
});
