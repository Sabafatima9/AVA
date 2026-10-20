/**
 * FR-CONV-13 / NFR-PRIV-1: PAN detection (Luhn-valid 13-19 digits, spaces or
 * dashes allowed between digits) and masking of contact details for
 * third-party calls.
 */

export const PAN_PLACEHOLDER = "[card number removed]";

const CANDIDATE = /\b\d(?:[ -]?\d){12,18}\b/g;

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export interface PanRedaction {
  text: string;
  found: boolean;
}

export function redactPan(text: string): PanRedaction {
  let found = false;
  const out = text.replace(CANDIDATE, (match) => {
    const digits = match.replace(/[ -]/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
      found = true;
      return PAN_PLACEHOLDER;
    }
    return match;
  });
  return { text: out, found };
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+?\d{1,3}[ .-]?)?(?:\(\d{2,4}\)[ .-]?)?\d{3}[ .-]\d{3,4}(?:[ .-]\d{2,4})?/g;
const STREET =
  /\b\d{1,5}\s+(?:[A-Za-z0-9.'-]+\s){0,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl|terrace|ter)\b\.?/gi;

/** Mask direct identifiers before text leaves for Drex (never sees PII). */
export function maskForDrex(text: string): string {
  return redactPan(text)
    .text.replace(EMAIL, "[email]")
    .replace(STREET, "[address]")
    .replace(PHONE, "[phone]");
}

/** Mask an email for display in admin views: s***@e***.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local[0]}***@${host[0] ?? ""}***${tld}`;
}

export const ORDER_NUMBER_RE = /\b(?:#\s?)?(SB\d{4,6})\b/i;
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/** FR-VER-6: pull an order number and email out of free text. */
export function extractOrderAndEmail(text: string): {
  orderNumber: string | null;
  email: string | null;
} {
  const order = ORDER_NUMBER_RE.exec(text);
  const email = EMAIL_RE.exec(text);
  return {
    orderNumber: order?.[1] ? order[1].toUpperCase() : null,
    email: email?.[0] ? email[0].trim().toLowerCase() : null,
  };
}
