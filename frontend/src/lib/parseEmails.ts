const EMAIL_IN_TEXT = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_EXACT = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export const isEmail = (s: string) => EMAIL_EXACT.test(s.trim());

/**
 * Pulls every email address out of CSV / plain-text content, regardless of column
 * layout or delimiter, lowercased and de-duplicated in first-seen order.
 */
export function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_IN_TEXT) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase()))];
}

export const mergeEmails = (current: string[], incoming: string[]) => [...new Set([...current, ...incoming])];
