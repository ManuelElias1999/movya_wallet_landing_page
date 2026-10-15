import { mkdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { renderPage, escape } from "../src/template.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "dist");
const url = new URL(process.env.SITE_URL || "https://movyawallet.com");
if (!["https:", "http:"].includes(url.protocol))
  throw new Error("SITE_URL must be an HTTP(S) URL.");
const basePath = (process.env.BASE_PATH || "").replace(/\/$/, "");
if (basePath && !/^\/[a-zA-Z0-9/_-]+$/.test(basePath))
  throw new Error(
    "BASE_PATH must be an absolute URL path, such as /movya_wallet_landing_page.",
  );
const options = { origin: url.origin, basePath };
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, "es"), { recursive: true });
await cp(path.join(root, "public"), out, { recursive: true });
for (const file of ["styles.css", "app.js", "demo.js"])
  await cp(path.join(root, "src", file), path.join(out, file));
await writeFile(path.join(out, "index.html"), renderPage("en", options));
await writeFile(path.join(out, "es", "index.html"), renderPage("es", options));
const routes = ["/", "/es/"].map((r) => `${url.origin}${basePath}${r}`);
await writeFile(
  path.join(out, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${url.origin}${basePath}/sitemap.xml\n`,
);
const xmlEscape = (s) => escape(s);
await writeFile(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${routes.map((loc) => `<url><loc>${xmlEscape(loc)}</loc><xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(routes[0])}"/><xhtml:link rel="alternate" hreflang="es" href="${xmlEscape(routes[1])}"/></url>`).join("")}</urlset>`,
);
await writeFile(
  path.join(out, "404.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — Movya Wallet</title><link rel="stylesheet" href="${basePath}/styles.css"></head><body><main class="section container"><a class="brand" href="${basePath}/"><img src="${basePath}/assets/movya-logo.png" width="60" height="60" alt="Movya">movya</a><h1 style="white-space:normal;font-size:clamp(32px,6vw,64px)">Let’s get you back to Movya.</h1><p style="margin-top:24px">This page could not be found. / No encontramos esta página.</p><a class="button button-blue" style="margin-top:30px" href="${basePath}/">English ${"→"}</a> <a class="button" href="${basePath}/es/">Español ${"→"}</a></main></body></html>`,
);
console.log(
  `Built English and Spanish pages in dist/ (${url.origin}${basePath}).`,
);
