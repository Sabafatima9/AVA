import { describe, expect, it } from "vitest";
import { ConfigError, type EnvSource, parseEnv } from "../../src/config/env.js";

const NACE_KEY = `nace_sk_${"a".repeat(43)}`;
const LEAKED = "llm-value-must-not-appear";

function validEnv(): EnvSource {
  return {
    ALLOWED_ORIGINS: "http://localhost:3000",
    DATABASE_URL: "postgres://support_agent:pw@127.0.0.1:54322/postgres",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SECRET_KEY: "local-supabase-secret",
    NACE_API_KEY: NACE_KEY,
    LLM_BASE_URL: "https://api.commandcode.ai/provider/v1",
    LLM_API_KEY: LEAKED,
    LLM_MODEL: "deepseek/deepseek-v4-flash",
    ADMIN_API_KEY: "a".repeat(32),
    TOKEN_PEPPER: "b".repeat(32),
    OTP_PEPPER: "c".repeat(32),
  };
}

describe("NFR-SEC-2 config startup names missing variables", () => {
  it("throws the missing name and not the value of another variable", () => {
    const source = validEnv();
    delete source.DATABASE_URL;

    expect(() => parseEnv(source)).toThrow(ConfigError);
    try {
      parseEnv(source);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const configError = error as ConfigError;
      expect(configError.variables).toEqual(["DATABASE_URL"]);
      expect(configError.message).toContain("DATABASE_URL");
      expect(configError.message).not.toContain(LEAKED);
      expect(configError.message).not.toContain(NACE_KEY);
    }
  });

  it("lists every missing name when several variables are absent", () => {
    const source = validEnv();
    delete source.LLM_API_KEY;
    delete source.LLM_MODEL;

    try {
      parseEnv(source);
      expect.fail("parseEnv should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const configError = error as ConfigError;
      expect(configError.variables).toEqual(
        expect.arrayContaining(["LLM_API_KEY", "LLM_MODEL"]),
      );
      expect(configError.message).not.toContain("deepseek");
    }
  });

  it("does not echo a secret that failed validation", () => {
    const source = validEnv();
    source.ADMIN_API_KEY = "too-short";

    try {
      parseEnv(source);
      expect.fail("parseEnv should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const configError = error as ConfigError;
      expect(configError.variables).toContain("ADMIN_API_KEY");
      expect(configError.message).not.toContain("too-short");
    }
  });

  it("rejects a malformed NACE key without echoing it", () => {
    const source = validEnv();
    const badKey = `nace_sk_${"z".repeat(10)}`;
    source.NACE_API_KEY = badKey;

    try {
      parseEnv(source);
      expect.fail("parseEnv should throw");
    } catch (error) {
      const configError = error as ConfigError;
      expect(configError.variables).toEqual(["NACE_API_KEY"]);
      expect(configError.message).not.toContain(badKey);
    }
  });

  it("names malformed numbers and non-http URLs", () => {
    const source = validEnv();
    source.PORT = "70000";
    source.NACE_RPM = "fast";
    source.SUPABASE_URL = "javascript:alert(1)";
    source.WEBHOOK_URL = "ftp://hooks.example.com";

    try {
      parseEnv(source);
      expect.fail("parseEnv should throw");
    } catch (error) {
      const configError = error as ConfigError;
      expect([...configError.variables].sort()).toEqual([
        "NACE_RPM",
        "PORT",
        "SUPABASE_URL",
        "WEBHOOK_URL",
      ]);
      expect(configError.message).not.toContain("javascript");
    }
  });

  it("treats blank values as unset, as in a copied .env.example", () => {
    const source = validEnv();
    source.WEBHOOK_URL = "";
    source.EMAIL_API_KEY = "";
    source.STRIPE_SECRET_KEY = "  ";

    const config = parseEnv(source);
    expect(config.webhookUrl).toBeUndefined();
    expect(config.emailApiKey).toBeUndefined();
    expect(config.stripeSecretKey).toBeUndefined();

    source.DATABASE_URL = "   ";
    expect(() => parseEnv(source)).toThrow(/DATABASE_URL/);
  });

  it("applies the documented defaults", () => {
    const config = parseEnv(validEnv());

    expect(config.port).toBe(8787);
    expect(config.naceModel).toBe("drex-v1.5");
    expect(config.naceMaxInFlight).toBe(8);
    expect(config.naceRpm).toBe(120);
    expect(config.naceBaseUrl).toBe("https://console.nace.ai");
    expect(config.llmProvider).toBe("openai_compatible");
    expect(config.llmFallbackModel).toBe("gpt-6-luna");
    expect(config.emailProvider).toBe("console");
    expect(config.paymentProvider).toBe("manual");
    expect(config.logLevel).toBe("info");
    expect(config.commerceMappingPath).toBe("config/commerce-mapping.json");
    expect(config.allowedOrigins).toEqual(["http://localhost:3000"]);
  });

  it("requires email settings only when the provider is not console", () => {
    const source = validEnv();
    source.EMAIL_PROVIDER = "resend";

    try {
      parseEnv(source);
      expect.fail("parseEnv should throw");
    } catch (error) {
      const configError = error as ConfigError;
      expect(configError.variables).toEqual(["EMAIL_API_KEY", "EMAIL_FROM"]);
    }

    source.EMAIL_API_KEY = "email-key";
    source.EMAIL_FROM = "support@example.com";
    expect(parseEnv(source).emailFrom).toBe("support@example.com");
  });

  it("requires the Stripe key only for the stripe provider", () => {
    const source = validEnv();
    source.PAYMENT_PROVIDER = "stripe";

    expect(() => parseEnv(source)).toThrow(/STRIPE_SECRET_KEY/);

    source.STRIPE_SECRET_KEY = "stripe-test";
    expect(parseEnv(source).stripeSecretKey).toBe("stripe-test");
  });

  it("requires catalog and setup variables only when those features are requested", () => {
    expect(() => parseEnv(validEnv(), { features: ["catalog"] })).toThrow(
      /CATALOG_DATABASE_URL/,
    );
    expect(() => parseEnv(validEnv(), { features: ["setup"] })).toThrow(
      /DATABASE_ADMIN_URL/,
    );

    const source = validEnv();
    source.CATALOG_DATABASE_URL =
      "postgres://support_catalog_ro:pw@127.0.0.1:54322/postgres";
    source.DATABASE_ADMIN_URL =
      "postgres://postgres:pw@127.0.0.1:54322/postgres";
    source.SUPPORT_AGENT_DB_PASSWORD = "local-dev-password";

    const config = parseEnv(source, { features: ["catalog", "setup"] });
    expect(config.catalogDatabaseUrl).toBe(source.CATALOG_DATABASE_URL);
    expect(config.supportAgentDbPassword).toBe("local-dev-password");
  });
});
