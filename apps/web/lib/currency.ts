const currencyInput =
  /^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)(?:\.([0-9]{1,2}))?\s*$/;

export function parseUsdToCents(value: string): bigint {
  const normalized = value.trim();
  if (!normalized) throw new Error("INVALID_MONEY");
  const match = normalized.match(currencyInput);
  if (!match) throw new Error("INVALID_MONEY");
  const dollars = match[1].replaceAll(",", "");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = BigInt(dollars) * 100n + BigInt(fraction || "0");
  if (cents > 9_999_999_999_999n) throw new Error("INVALID_MONEY");
  return cents;
}

export function formatUsdFromCents(value?: bigint | number | null): string {
  if (value === undefined || value === null) return "Not recorded";
  const cents = typeof value === "bigint" ? value : BigInt(value);
  const dollars = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${fraction}`;
}
