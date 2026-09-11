const NUMBER_LOCALE = "en-US";

/** Currency code (RUB/USD/EUR) -> display symbol. */
export function currencySymbol(currency: string | null | undefined): string {
  switch (currency) {
    case "RUB":
      return "₽";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    default:
      return currency ?? "₽";
  }
}

/** Format a rouble amount, e.g. `123456` -> `123,456 RUB`. */
export function roubles(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString(NUMBER_LOCALE)} ₽`;
}

/** Format an amount in an arbitrary currency, e.g. `(70, "USD")` -> `70 $`. */
export function money(
  value: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString(NUMBER_LOCALE)} ${currencySymbol(currency)}`;
}

/** Signed percentage with one decimal, e.g. `-2.5` -> `-2.5%`. */
export function signedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** Ratio in [0,1] -> rounded percentage, e.g. `0.08` -> `8%`. */
export function ratioPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

/** Clamp a string to Discord's 1024-char embed field-value limit. */
export function clampField(value: string): string {
  return truncate(value, 1024);
}
