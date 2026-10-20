import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** SRS §13.3, plus DATABASE_ADMIN_URL from the execution plan. */
const REQUIRED_VARIABLES = [
  "PORT",
  "NODE_ENV",
  "ALLOWED_ORIGINS",
  "DATABASE_URL",
  "CATALOG_DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "NACE_API_KEY",
  "NACE_BASE_URL",
  "NACE_MODEL",
  "NACE_MAX_IN_FLIGHT",
  "NACE_RPM",
  "LLM_PROVIDER",
  "LLM_BASE_URL",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_FALLBACK_MODEL",
  "ADMIN_API_KEY",
  "TOKEN_PEPPER",
  "OTP_PEPPER",
  "EMAIL_PROVIDER",
  "EMAIL_API_KEY",
  "EMAIL_FROM",
  "WEBHOOK_URL",
  "WEBHOOK_SECRET",
  "PAYMENT_PROVIDER",
  "STRIPE_SECRET_KEY",
  "COMMERCE_MAPPING_PATH",
  "SUPPORT_AGENT_DB_PASSWORD",
  "LOG_LEVEL",
  "DATABASE_ADMIN_URL",
] as const;

function assignedNames(text: string): Set<string> {
  const names = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    names.add(line.slice(0, separator));
  }
  return names;
}

describe("NFR-SEC-2 env example lists names and no live secrets", () => {
  const text = readFileSync(
    new URL("../../.env.example", import.meta.url),
    "utf8",
  );

  it("lists every SRS 13.3 variable and DATABASE_ADMIN_URL", () => {
    const names = assignedNames(text);
    for (const name of REQUIRED_VARIABLES) {
      expect(names.has(name), name).toBe(true);
    }
  });

  it("does not contain a live NACE key or Supabase secret prefix", () => {
    expect(text).not.toContain("nace_sk_");
    expect(text).not.toContain("sb_secret_");
  });
});
