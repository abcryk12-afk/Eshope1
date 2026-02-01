export type LocalizedText = Record<string, string | undefined>;

export function pickLocalizedText(
  value: unknown,
  lang: string,
  fallbackLang: string
): string {
  const obj = (value && typeof value === "object" ? (value as Record<string, unknown>) : null) as
    | Record<string, unknown>
    | null;

  const direct = obj ? obj[lang] : undefined;
  if (typeof direct === "string" && direct.trim()) return direct;

  const fallback = obj ? obj[fallbackLang] : undefined;
  if (typeof fallback === "string" && fallback.trim()) return fallback;

  if (obj) {
    for (const v of Object.values(obj)) {
      if (typeof v === "string" && v.trim()) return v;
    }
  }

  return "";
}

export function hasLocalizedText(value: unknown, lang: string): boolean {
  const obj = (value && typeof value === "object" ? (value as Record<string, unknown>) : null) as
    | Record<string, unknown>
    | null;

  const direct = obj ? obj[lang] : undefined;
  return typeof direct === "string" && direct.trim().length > 0;
}
