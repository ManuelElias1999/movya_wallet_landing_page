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
const choose = (select, value, window) => {
  for (const option of select.options) option.removeAttribute("selected");
  const option = [...select.options].find(option => option.value === value);
  assert.ok(option, `Available choice: ${value}`);
  option.selected = true;
  select.dispatchEvent(new window.Event("change"));
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
    full_name: null,
    country: null,
    city: null,
    phone: null,
    language: "en",
    consent_at: "2026-10-15T22:00:00.000Z",
    source: "landing",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("optional profile details preserve international names, places and phone formatting", async () => {
  let saved;
  const handler = createWhitelistHandler({
    env: environment,
    fetcher: async (_, options) => {
      saved = JSON.parse(options.body);
      return new Response(null, { status: 201 });
    },
  });
  const response = await handler(request({
    ...payload,
    name: "  Ana María 李  ",
    country: " Bolivia ",
    city: " La Paz ",
    phone: " +591 (700) 000-00 ",
  }));
  assert.equal(response.status, 200);
  assert.equal(saved.full_name, "Ana María 李");
  assert.equal(saved.country, "Bolivia");
  assert.equal(saved.city, "La Paz");
  assert.equal(saved.phone, "+591 (700) 000-00");
  await handler(request({ ...payload, name: "   ", country: null, city: "", phone: " " }));
  for (const key of ["full_name", "country", "city", "phone"])
    assert.equal(saved[key], null);
});
test("invalid optional fields are rejected without writing to storage", async () => {
  let calls = 0;
  const handler = createWhitelistHandler({
    env: environment,
    fetcher: async () => { calls++; return new Response(null, { status: 201 }); },
  });
  for (const [key, limit] of [["name", 120], ["country", 100], ["city", 120], ["phone", 40]]) {
    for (const value of ["x".repeat(limit + 1), {}, 1234, ["unexpected"], "a\u0000b", "a\nb"])
      assert.equal((await handler(request({ ...payload, [key]: value }))).status, 400);
  }
  assert.equal(calls, 0);
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
    for (const key of ["name", "country", "city", "phone"]) {
      const input = document.querySelector(`#whitelist-${key}`);
      assert.ok(input);
      assert.equal(input.hasAttribute("required"), false);
      assert.equal(document.querySelector(`label[for="whitelist-${key}"]`).textContent, copy[key]);
    }
    assert.equal(email.hasAttribute("required"), true);
    assert.equal(document.querySelectorAll('#whitelist-form .required-star').length, 1);
    assert.ok(document.querySelector('label[for="whitelist-email"] .required-star'));
    assert.ok(!form.textContent.includes(lang === "es" ? "Opcional" : "Optional"));
    const status = document.querySelector("#whitelist-status");
    const success = document.querySelector("#whitelist-success");
    const scrolls = [];
    const frames = [];
    let countRefreshes = 0;
    document.addEventListener("whitelist:joined", () => countRefreshes++);
    window.requestAnimationFrame = callback => frames.push(callback);
    window.matchMedia = () => ({ matches: lang === "es" });
    document.querySelector(".whitelist-card").scrollIntoView = options => {
      assert.equal(form.hidden, true);
      assert.equal(success.hidden, false);
      scrolls.push(options);
    };
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
    assert.equal(frames.length, 0, "Failed submissions keep the form in place");
    assert.equal(countRefreshes, 0);
    submit();
    fulfill(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await settle();
    assert.equal(success.hidden, false);
    assert.equal(form.hidden, true);
    assert.equal(email.value, "");
    assert.equal(countRefreshes, 1, "Refresh the total only after a confirmed signup");
    assert.equal(frames.length, 1, "Wait for the confirmation layout before centering");
    frames.shift()();
    assert.deepEqual(scrolls, [{
      block: "center", inline: "nearest",
      behavior: lang === "es" ? "instant" : "smooth",
    }]);
    assert.deepEqual(JSON.parse(records[0].options.body), {
      email: "test@example.com",
      name: null,
      country: null,
      city: null,
      phone: null,
      consent: true,
      language: lang,
      website: "",
    });
    assert.equal(records[0].url, "/api/whitelist");
    assert.equal(records[0].options.method, "POST");
    assert.equal(document.querySelector('footer a[href*="github"]'), null);
    assert.ok(!document.body.textContent.includes("Wallet source"));
  });
for (const lang of ["en", "es"])
  test(`${lang}: optional details travel from the form through the API into the saved record`, async () => {
    const { window, document } = parseHTML(renderPage(lang));
    window.HTMLElement.prototype.focus = function () {};
    let saved;
    const handler = createWhitelistHandler({ env: environment, fetcher: async (_, options) => {
      saved = JSON.parse(options.body);
      return new Response(null, { status: 201 });
    }});
    initWhitelist(document, (url, options) => handler(new Request(new URL(url, origin), {
      ...options, headers: { ...options.headers, origin },
    })));
    document.querySelector("#whitelist-email").value = " PROFILE@Example.com ";
    document.querySelector("#whitelist-name").value = " María López ";
    choose(document.querySelector("#whitelist-country"), "BO", window);
    choose(document.querySelector("#whitelist-city"), "Cochabamba", window);
    document.querySelector("#whitelist-phone").value = " 7000 0000 ";
    document.querySelector("#whitelist-consent").checked = true;
    document.querySelector("#whitelist-form").dispatchEvent(new window.Event("submit", { cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(saved.email, "profile@example.com");
    assert.equal(saved.full_name, "María López");
    assert.equal(saved.country, "Bolivia");
    assert.equal(saved.city, "Cochabamba");
    assert.equal(saved.phone, "+591 70000000");
    assert.equal(saved.language, lang);
    assert.equal(document.querySelector("#whitelist-success").hidden, false);
  });
test("phone prefixes show localized countries and flags and combine only when a number is entered", async () => {
  const { window, document } = parseHTML(renderPage("es"));
  window.HTMLElement.prototype.focus = function () {};
  const form = document.querySelector("#whitelist-form");
  const prefix = document.querySelector("#whitelist-phone-prefix");
  const number = document.querySelector("#whitelist-phone");
  const status = document.querySelector("#whitelist-status");
  const records = [];
  initWhitelist(document, async (_, options) => {
    records.push(JSON.parse(options.body));
    return Response.json({ ok: false }, { status: 503 });
  });
  const submit = async () => {
    form.dispatchEvent(new window.Event("submit", { cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
  };
  assert.ok(prefix.options.length > 200);
  assert.ok(prefix.querySelector('option[value="ES"]').textContent.includes("España"));
  assert.ok(prefix.querySelector('option[value="US"]').textContent.includes("🇺🇸"));
  assert.equal(number.getAttribute("autocomplete"), "tel-national");
  assert.equal(prefix.hasAttribute("required"), false);
  for (const option of prefix.options) option.removeAttribute("selected");
  prefix.querySelector('option[value="ES"]').selected = true;
  prefix.dispatchEvent(new window.Event("change"));
  assert.equal(document.querySelector("#whitelist-phone-prefix-display").textContent, "🇪🇸 +34");
  document.querySelector("#whitelist-email").value = "phone@example.com";
  document.querySelector("#whitelist-consent").checked = true;
  await submit();
  assert.equal(records.at(-1).phone, null);
  number.value = "612 345-678";
  await submit();
  assert.equal(records.at(-1).phone, "+34 612345678");
  for (const value of ["+34 612345678", "call me", "123", "123456789012345"]) {
    number.value = value;
    await submit();
    assert.equal(status.textContent, content.es.whitelist.phoneError);
  }
  assert.equal(records.length, 2, "Invalid numbers never reach storage");
});
for (const lang of ["en", "es"])
  test(`${lang}: country and city lists support manual entries and clear locations when the country changes`, async () => {
    const { window, document } = parseHTML(renderPage(lang));
    window.HTMLElement.prototype.focus = function () {};
    const form = document.querySelector("#whitelist-form");
    const country = document.querySelector("#whitelist-country");
    const countryOther = document.querySelector("#whitelist-country-other");
    const city = document.querySelector("#whitelist-city");
    const cityOther = document.querySelector("#whitelist-city-other");
    const records = [];
    initWhitelist(document, async (_, options) => {
      records.push(JSON.parse(options.body));
      return Response.json({ ok: false }, { status: 503 });
    });
    const submit = async () => {
      form.dispatchEvent(new window.Event("submit", { cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      return records.at(-1);
    };
    assert.ok(country.options.length > 200);
    assert.equal(city.disabled, true);
    assert.equal(cityOther.hidden, true);
    document.querySelector("#whitelist-email").value = "location@example.com";
    document.querySelector("#whitelist-consent").checked = true;
    choose(country, "BO", window);
    assert.equal(city.disabled, false);
    assert.deepEqual(
      [...city.options].map(option => option.value).filter(value => value && value !== "__other"),
      ["Cobija", "Cochabamba", "La Paz", "Oruro", "Potosí", "Santa Cruz de la Sierra", "Sucre", "Tarija", "Trinidad"],
    );
    assert.ok([...city.options].some(option => option.value === "__other"));
    choose(city, "Cochabamba", window);
    assert.equal((await submit()).city, "Cochabamba");
    assert.equal(records.at(-1).country, "Bolivia");
    choose(city, "__other", window);
    assert.equal(cityOther.hidden, false);
    cityOther.value = " Rurrenabaque ";
    assert.equal((await submit()).city, "Rurrenabaque");
    choose(country, "PE", window);
    assert.equal(city.value, "");
    assert.equal(cityOther.value, "");
    assert.equal(cityOther.hidden, true);
    assert.ok([...city.options].some(option => option.value === "Lima"));
    assert.equal((await submit()).city, null);
    choose(country, "__other", window);
    assert.equal(countryOther.hidden, false);
    assert.equal(cityOther.hidden, false);
    countryOther.value = " País de prueba ";
    cityOther.value = " Ciudad de prueba ";
    const manual = await submit();
    assert.equal(manual.country, "País de prueba");
    assert.equal(manual.city, "Ciudad de prueba");
    choose(country, "AC", window);
    assert.equal(city.hidden, true, "Countries without city suggestions accept free text");
    assert.equal(cityOther.hidden, false);
    choose(country, "", window);
    assert.equal(city.disabled, true);
    assert.equal(countryOther.value, "");
    assert.equal(cityOther.value, "");
    const empty = await submit();
    assert.equal(empty.country, null);
    assert.equal(empty.city, null);
  });
test("header stays stable around the compact threshold and coalesces scroll events", () => {
  const { window, document } = parseHTML(renderPage("en"));
  const frames = [];
  window.scrollY = 0;
  window.innerHeight = 800;
  window.requestAnimationFrame = callback => frames.push(callback);
  initMotion(document, window);
  const header = document.querySelector(".site-header");
  const scroll = y => {
    window.scrollY = y;
    window.dispatchEvent(new window.Event("scroll"));
  };
  const flush = () => { while (frames.length) frames.shift()(); };
  scroll(24);
  flush();
  assert.equal(header.classList.contains("is-scrolled"), false);
  scroll(25);
  scroll(26);
  assert.equal(frames.length, 1, "Multiple scroll events share one frame");
  flush();
  assert.equal(header.classList.contains("is-scrolled"), true);
  // A 12px anchoring correction used to make the header expand again,
  // move the content down, and compact again without user input.
  for (const y of [14, 26, 14, 24, 9]) {
    scroll(y);
    flush();
    assert.equal(header.classList.contains("is-scrolled"), true);
  }
  scroll(8);
  flush();
  assert.equal(header.classList.contains("is-scrolled"), false);
  for (const y of [20, 24, 12, 0]) {
    scroll(y);
    flush();
    assert.equal(header.classList.contains("is-scrolled"), false);
  }
  scroll(100);
  flush();
  assert.equal(header.classList.contains("is-scrolled"), true);
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
