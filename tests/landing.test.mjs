import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { readFile } from "node:fs/promises";
import { content } from "../src/content.mjs";
import { renderPage } from "../src/template.mjs";
import { parseDemoMessage } from "../src/demo.js";

// Payment intent validation is shared by both languages; it never sends a payment.
test("English and Spanish intents preserve amounts, accents and comma decimals", () => {
  assert.deepEqual(parseDemoMessage("Send 20 USDC to Ouali"), {
    type: "payment",
    amount: "20",
    token: "USDC",
    recipient: "Ouali",
  });
  assert.deepEqual(parseDemoMessage("Envía 0,0000001 XLM a María"), {
    type: "payment",
    amount: "0.0000001",
    token: "XLM",
    recipient: "María",
  });
  assert.deepEqual(parseDemoMessage("SEND 5 xlm TO Alex"), {
    type: "payment",
    amount: "5",
    token: "XLM",
    recipient: "Alex",
  });
});
test("demo rejects zero, excess precision, excessive amounts and unsupported tokens", () => {
  for (const s of [
    "Send 0 USDC to Alex",
    "Send 0.00000001 XLM to Alex",
    "Envía 1000001 USDC a Ouali",
  ])
    assert.equal(parseDemoMessage(s).type, "limit");
  for (const s of [
    "Send -5 USDC to Alex",
    "Send 5 BTC to Alex",
    "Send 5 USDC to <img src=x>",
  ])
    assert.equal(parseDemoMessage(s).type, "fallback");
  assert.equal(parseDemoMessage("Muéstrame mi saldo").type, "balance");
  assert.equal(parseDemoMessage("How do I receive?").type, "receive");
});
test("both language pages have static copy, local navigation and matching SEO alternates", () => {
  for (const lang of ["en", "es"]) {
    const { document } = parseHTML(renderPage(lang));
    assert.equal(document.documentElement.lang, lang);
    assert.equal(
      document.querySelector("h1").textContent,
      content[lang].hero.join(""),
    );
    assert.equal(
      document.querySelector('[aria-current="page"]').textContent,
      lang.toUpperCase(),
    );
    assert.equal(document.querySelectorAll("details").length, 6);
    assert.equal(
      document.querySelector("details summary").textContent,
      content[lang].faq.items[0][0],
    );
    const ids = new Set(
      [...document.querySelectorAll("[id]")].map((x) => x.id),
    );
    for (const a of document.querySelectorAll('a[href^="#"]'))
      assert.ok(ids.has(a.getAttribute("href").slice(1)));
    assert.equal(
      document.querySelector('link[hreflang="es"]').href,
      "https://movyawallet.com/es/",
    );
    assert.equal(
      document.querySelector('link[hreflang="en"]').href,
      "https://movyawallet.com/",
    );
  }
});
test("custom host and GitHub Pages subpath preserve language and asset paths", () => {
  const { document } = parseHTML(
    renderPage("es", {
      origin: "https://example.org",
      basePath: "/movya_wallet_landing_page",
    }),
  );
  assert.equal(
    document.querySelector('link[rel="canonical"]').href,
    "https://example.org/movya_wallet_landing_page/es/",
  );
  assert.equal(
    document.querySelector(".language-switch a").getAttribute("href"),
    "/movya_wallet_landing_page/",
  );
  assert.ok(
    document
      .querySelector('script[type="module"]')
      .src.startsWith("/movya_wallet_landing_page/"),
  );
});
for (const lang of ["en", "es"])
  test(`${lang}: complete interactive demo, cancellation, reset and mobile navigation`, async () => {
    const { window, document } = parseHTML(renderPage(lang));
    globalThis.window = window;
    globalThis.document = document;
    window.matchMedia = () => ({ matches: false });
    window.innerWidth = 390;
    window.HTMLElement.prototype.focus = function () {
      document.__focused = this;
    };
    globalThis.fetch = () => {
      throw new Error("The demo must not call a network API.");
    };
    await import(`../src/app.js?test=${lang}`);
    const copy = content[lang].demo;
    const click = (node) =>
      node.dispatchEvent(new window.Event("click", { bubbles: true }));
    const submit = (message) => {
      document.querySelector("#demo-input").value = message;
      document
        .querySelector("#demo-form")
        .dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
    };
    click(document.querySelector('[data-suggestion="0"]'));
    assert.ok(
      document.querySelector(".demo-review").textContent.includes("20 USDC"),
    );
    assert.ok(
      document.querySelector(".demo-review").textContent.includes("Ouali"),
    );
    submit(copy.suggestions[1]);
    assert.ok(
      document.querySelector("#chat-stream").textContent.includes(copy.pending),
    );
    click(document.querySelector(".demo-cancel"));
    assert.ok(
      document
        .querySelector("#chat-stream")
        .textContent.includes(copy.cancelBody),
    );
    assert.equal(document.querySelector(".demo-confirm").disabled, true);
    submit(lang === "es" ? "Envía 5 XLM a Alex" : "Send 5 XLM to Alex");
    const confirms = document.querySelectorAll(".demo-confirm");
    click(confirms[confirms.length - 1]);
    assert.equal(
      document.querySelector(".demo-success strong").textContent,
      copy.success,
    );
    assert.ok(
      document
        .querySelector(".demo-success")
        .textContent.includes(copy.successBody),
    );
    click(document.querySelector("#reset-demo"));
    assert.equal(document.querySelector(".demo-review"), null);
    assert.equal(document.querySelector("#demo-suggestions").hidden, false);
    submit(copy.suggestions[1]);
    assert.ok(
      document.querySelector("#chat-stream").textContent.includes(copy.balance),
    );
    submit(copy.suggestions[2]);
    assert.ok(
      document.querySelector("#chat-stream").textContent.includes(copy.receive),
    );
    submit('<img src=x onerror="alert(1)">');
    assert.equal(
      document.querySelector("#chat-stream img"),
      null,
      "Messages cannot inject HTML",
    );
    assert.ok(
      document
        .querySelector("#chat-stream")
        .textContent.includes(copy.fallback),
    );
    const menu = document.querySelector(".menu-toggle");
    click(menu);
    assert.equal(menu.getAttribute("aria-expanded"), "true");
    assert.ok(
      document.querySelector("#main-nav").classList.contains("is-open"),
    );
    const escape = new window.Event("keydown");
    escape.key = "Escape";
    document.dispatchEvent(escape);
    assert.equal(menu.getAttribute("aria-expanded"), "false");
    click(menu);
    click(document.querySelector("#main-nav a"));
    assert.equal(menu.getAttribute("aria-expanded"), "false");
    click(menu);
    click(document.querySelector("main"));
    assert.equal(menu.getAttribute("aria-expanded"), "false");
  });
test("build artifacts are complete and use no runtime dependency or analytics", async () => {
  for (const lang of ["en", "es"]) {
    const html = await readFile(
      `dist/${lang === "es" ? "es/" : ""}index.html`,
      "utf8",
    );
    assert.ok(html.includes(`lang="${lang}"`));
    assert.ok(!html.includes("fonts.googleapis.com"));
    assert.ok(html.includes("social-" + lang + ".png"));
  }
  const app = await readFile("dist/app.js", "utf8");
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(app));
});
