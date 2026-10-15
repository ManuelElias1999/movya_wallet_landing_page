/** Local, deterministic demo only. No API calls, wallet keys or transaction signing. */
export function parseDemoMessage(message) {
  const raw = String(message).trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const match = raw.match(
    /^(?:send|env[ií]a(?:r)?)\s+(\d+(?:[.,]\d+)?)\s+(USDC|XLM)\s+(?:to|a)\s+([\p{L}\p{N} .'-]{1,40})[.!]?$/iu,
  );
  if (match) {
    const amount = match[1].replace(",", ".");
    const [whole, fractional = ""] = amount.split(".");
    // Stellar amounts allow up to seven decimal places. Avoid rounding user input.
    if (
      whole.length > 9 ||
      fractional.length > 7 ||
      Number(amount) <= 0 ||
      Number(amount) > 1_000_000
    )
      return { type: "limit" };
    return {
      type: "payment",
      amount,
      token: match[2].toUpperCase(),
      recipient: match[3].trim().replace(/[.!]$/, ""),
    };
  }
  if (/balance|saldo/.test(normalized)) return { type: "balance" };
  if (/receiv|recib/.test(normalized)) return { type: "receive" };
  return { type: "fallback" };
}
