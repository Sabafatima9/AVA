import { z } from "zod";

/** Names required for each integration. Core is always checked. */
export const requiredByFeature = {
  core: [
    "ALLOWED_ORIGINS",
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "NACE_API_KEY",
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "LLM_MODEL",
    "ADMIN_API_KEY",
    "TOKEN_PEPPER",
    "OTP_PEPPER",
  ],
  email: ["EMAIL_API_KEY", "EMAIL_FROM"],
  stripe: ["STRIPE_SECRET_KEY"],
  catalog: ["CATALOG_DATABASE_URL"],
  setup: ["DATABASE_ADMIN_URL", "SUPPORT_AGENT_DB_PASSWORD"],
} as const;

export type EnvFeature = "catalog" | "setup";

export interface ParseEnvOptions {
  features?: readonly EnvFeature[];
}

export type EnvSource = Record<string, string | undefined>;

const logLevels = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

export type LogLevel = (typeof logLevels)[number];

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "test" | "production";
  allowedOrigins: readonly string[];
  databaseUrl: string;
  catalogDatabaseUrl: string | undefined;
  databaseAdminUrl: string | undefined;
  supabaseUrl: string;
  supabaseSecretKey: string;
  naceApiKey: string;
  naceBaseUrl: string;
  naceModel: string;
  naceMaxInFlight: number;
  naceRpm: number;
  llmProvider: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmFallbackModel: string;
  adminApiKey: string;
  tokenPepper: string;
  otpPepper: string;
  emailProvider: string;
  emailApiKey: string | undefined;
  emailFrom: string | undefined;
  webhookUrl: string | undefined;
  webhookSecret: string | undefined;
  paymentProvider: string;
  stripeSecretKey: string | undefined;
  commerceMappingPath: string;
  supportAgentDbPassword: string | undefined;
  logLevel: LogLevel;
}

/**
 * Startup failure for configuration. The message lists variable names only.
 */
export class ConfigError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    const names = [...new Set(variables)];
    super(`Missing or invalid environment variables: ${names.join(", ")}`);
    this.name = "ConfigError";
    this.variables = names;
  }
}

const positiveInt = z.coerce.number().int().positive();

const httpUrl = z.url({ protocol: /^https?$/ });

const secretBytes = z.string().refine((value) => byteLength(value) >= 32);

const optionalText = z.string().min(1).optional();

const envSchema = z.object({
  PORT: positiveInt.max(65535).default(8787),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    )
    .refine((origins) => origins.length > 0),
  DATABASE_URL: z.string().min(1),
  CATALOG_DATABASE_URL: optionalText,
  DATABASE_ADMIN_URL: optionalText,
  SUPABASE_URL: httpUrl,
  SUPABASE_SECRET_KEY: z.string().min(1),
  NACE_API_KEY: z.string().regex(/^nace_sk_[A-Za-z0-9_-]{43}$/),
  NACE_BASE_URL: httpUrl.default("https://console.nace.ai"),
  NACE_MODEL: z.string().min(1).default("drex-v1.5"),
  NACE_MAX_IN_FLIGHT: positiveInt.default(8),
  NACE_RPM: positiveInt.default(120),
  LLM_PROVIDER: z.string().min(1).default("openai_compatible"),
  LLM_BASE_URL: httpUrl,
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1),
  LLM_FALLBACK_MODEL: z.string().min(1).default("gpt-6-luna"),
  ADMIN_API_KEY: secretBytes,
  TOKEN_PEPPER: secretBytes,
  OTP_PEPPER: secretBytes,
  EMAIL_PROVIDER: z.string().min(1).default("console"),
  EMAIL_API_KEY: optionalText,
  EMAIL_FROM: optionalText,
  WEBHOOK_URL: httpUrl.optional(),
  WEBHOOK_SECRET: optionalText,
  PAYMENT_PROVIDER: z.string().min(1).default("manual"),
  STRIPE_SECRET_KEY: optionalText,
  COMMERCE_MAPPING_PATH: z
    .string()
    .min(1)
    .default("config/commerce-mapping.json"),
  SUPPORT_AGENT_DB_PASSWORD: optionalText,
  LOG_LEVEL: z.enum(logLevels).default("info"),
});

type ParsedEnv = z.output<typeof envSchema>;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function blankToUndefined(source: EnvSource): EnvSource {
  const normalized: EnvSource = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") {
      normalized[key] = value;
    }
  }
  return normalized;
}

function issueNames(error: z.ZodError): string[] {
  const names: string[] = [];
  for (const issue of error.issues) {
    const head = issue.path[0];
    if (typeof head === "string") {
      names.push(head);
    }
  }
  return names;
}

function featureGaps(
  parsed: ParsedEnv,
  features: readonly EnvFeature[],
): string[] {
  const missing: string[] = [];
  if (parsed.EMAIL_PROVIDER.toLowerCase() !== "console") {
    if (parsed.EMAIL_API_KEY === undefined) {
      missing.push(requiredByFeature.email[0]);
    }
    if (parsed.EMAIL_FROM === undefined) {
      missing.push(requiredByFeature.email[1]);
    }
  }
  if (
    parsed.PAYMENT_PROVIDER.toLowerCase() === "stripe" &&
    parsed.STRIPE_SECRET_KEY === undefined
  ) {
    missing.push(requiredByFeature.stripe[0]);
  }
  if (
    features.includes("catalog") &&
    parsed.CATALOG_DATABASE_URL === undefined
  ) {
    missing.push(requiredByFeature.catalog[0]);
  }
  if (features.includes("setup")) {
    if (parsed.DATABASE_ADMIN_URL === undefined) {
      missing.push(requiredByFeature.setup[0]);
    }
    if (parsed.SUPPORT_AGENT_DB_PASSWORD === undefined) {
      missing.push(requiredByFeature.setup[1]);
    }
  }
  return missing;
}

function toConfig(parsed: ParsedEnv): AppConfig {
  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    allowedOrigins: parsed.ALLOWED_ORIGINS,
    databaseUrl: parsed.DATABASE_URL,
    catalogDatabaseUrl: parsed.CATALOG_DATABASE_URL,
    databaseAdminUrl: parsed.DATABASE_ADMIN_URL,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseSecretKey: parsed.SUPABASE_SECRET_KEY,
    naceApiKey: parsed.NACE_API_KEY,
    naceBaseUrl: parsed.NACE_BASE_URL,
    naceModel: parsed.NACE_MODEL,
    naceMaxInFlight: parsed.NACE_MAX_IN_FLIGHT,
    naceRpm: parsed.NACE_RPM,
    llmProvider: parsed.LLM_PROVIDER,
    llmBaseUrl: parsed.LLM_BASE_URL,
    llmApiKey: parsed.LLM_API_KEY,
    llmModel: parsed.LLM_MODEL,
    llmFallbackModel: parsed.LLM_FALLBACK_MODEL,
    adminApiKey: parsed.ADMIN_API_KEY,
    tokenPepper: parsed.TOKEN_PEPPER,
    otpPepper: parsed.OTP_PEPPER,
    emailProvider: parsed.EMAIL_PROVIDER,
    emailApiKey: parsed.EMAIL_API_KEY,
    emailFrom: parsed.EMAIL_FROM,
    webhookUrl: parsed.WEBHOOK_URL,
    webhookSecret: parsed.WEBHOOK_SECRET,
    paymentProvider: parsed.PAYMENT_PROVIDER,
    stripeSecretKey: parsed.STRIPE_SECRET_KEY,
    commerceMappingPath: parsed.COMMERCE_MAPPING_PATH,
    supportAgentDbPassword: parsed.SUPPORT_AGENT_DB_PASSWORD,
    logLevel: parsed.LOG_LEVEL,
  };
}

/**
 * Parse a configuration record. Does not read the process environment.
 * Throws ConfigError with variable names and no values.
 */
export function parseEnv(
  source: EnvSource,
  options?: ParseEnvOptions,
): AppConfig {
  const parsed = envSchema.safeParse(blankToUndefined(source));
  if (!parsed.success) {
    throw new ConfigError(issueNames(parsed.error));
  }
  const gaps = featureGaps(parsed.data, options?.features ?? []);
  if (gaps.length > 0) {
    throw new ConfigError(gaps);
  }
  return toConfig(parsed.data);
}
