import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { content } from "../src/content.mjs";

const dist = path.resolve("dist");
for (const [lang, filename] of [
  ["en", "index.html"],
  ["es", "es/index.html"],
]) {
  const html = await readFile(path.join(dist, filename), "utf8");
  assert.ok(html.includes(`<html lang="${lang}">`));
  assert.equal(
    (html.match(/<h1[ >]/g) || []).length,
    1,
    "Exactly one h1 per page",
  );
  assert.ok(!/TODO|Lorem ipsum|undefined|\[object Object\]/.test(html));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
  assert.equal(ids.length, new Set(ids).size, "IDs are unique");
  for (const [, hash] of html.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.includes(hash), `Missing section #${hash}`);
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^(https?:|data:)/.test(asset)) continue;
    let relative = asset.replace(/^\//, "");
    if (!asset.startsWith("/"))
      relative = path.join(path.dirname(filename), relative);
    const target = path.join(dist, relative);
    assert.ok(target.startsWith(dist + path.sep) || target === dist);
    assert.ok(
      (await stat(target)).isFile() || (await stat(target)).isDirectory(),
      `Missing asset ${asset}`,
    );
  }
  const data = html.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/s,
  );
  assert.ok(JSON.parse(data[1])["@graph"].length >= 3);
  const demo = html.match(
    /<script id="demo-copy" type="application\/json">(.*?)<\/script>/s,
  );
  assert.deepEqual(JSON.parse(demo[1]), content[lang].demo);
  console.log(
    `Verified ${lang}: local assets, anchors, metadata, structured data and demo copy.`,
  );
}
const css = await readFile(path.join(dist, "styles.css"), "utf8");
for (const [, font] of css.matchAll(/url\('\.\/(.*?)'\)/g))
  assert.ok((await stat(path.join(dist, font))).size > 0);
assert.ok(css.includes("prefers-reduced-motion"));
console.log("Verified self-hosted fonts and reduced-motion styles.");
