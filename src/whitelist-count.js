/** Read only the public total, never subscriber details. */
export function initWhitelistCount(root = document, send = (...args) => fetch(...args)) {
  const counter = root.querySelector("#whitelist-count");
  if (!counter) return;
  const copy = JSON.parse(root.querySelector("#whitelist-copy").textContent);
  let version = 0;
  async function refresh() {
    const current = ++version;
    try {
      const response = await send(counter.dataset.endpoint, {
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json();
      if (current !== version) return;
      if (!response.ok || !Number.isSafeInteger(data?.count) || data.count < 0)
        throw new Error("Count unavailable");
      counter.querySelector("[data-whitelist-total]").textContent =
        new Intl.NumberFormat(root.documentElement.lang).format(data.count);
      counter.querySelector("[data-whitelist-count-label]").textContent =
        data.count === 1 ? copy.countOne : copy.countMany;
      counter.hidden = false;
    } catch {
      if (current === version) counter.hidden = true;
    }
  }
  root.addEventListener("whitelist:joined", refresh);
  return refresh();
}
