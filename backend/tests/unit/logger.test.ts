import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, redactLogLine } from "../../src/observability/logger.js";

const NACE_KEY = `nace_sk_${"d".repeat(43)}`;
const SUPABASE_SECRET = `sb_secret_${"e".repeat(20)}`;

function capture() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return {
    logger: createLogger({ level: "info", destination }),
    output: () => lines.join(""),
  };
}

describe("NFR-SEC-2 logger redacts secrets", () => {
  it("never writes a NACE key or a Supabase secret", () => {
    const { logger, output } = capture();

    logger.info(
      {
        note: `customer pasted ${NACE_KEY}`,
        headers: {
          authorization: `Bearer ${NACE_KEY}`,
          "x-customer-token": SUPABASE_SECRET,
        },
        nested: [`prefix ${SUPABASE_SECRET}`],
      },
      `failed with ${SUPABASE_SECRET}`,
    );
    logger.child({ apiKey: NACE_KEY }).info({ order: "A10234" }, "looking up");
    logger.error(new Error(`upstream rejected ${NACE_KEY}`));

    const text = output();
    expect(text).not.toContain("nace_sk_");
    expect(text).not.toContain("sb_secret_");
    expect(text).toContain("A10234");
    expect(text).toContain("looking up");
    expect(text).toContain("upstream rejected");
  });

  it("redacts values stored under sensitive key names", () => {
    const { logger, output } = capture();

    logger.info({
      password: "hunter2",
      token: "session-token",
      pepper: "otp-pepper",
      customSecret: "hidden-value",
      apikey: "compound-key",
      authtoken: "compound-token",
      secrets: ["listed-secret"],
      refresh_tokens: ["refresh-value"],
      headers: {
        Cookie: "sb-auth=cookie-value",
        "set-cookie": "sid=set-cookie-value",
      },
      order: "A10235",
    });

    const text = output();
    for (const secret of [
      "hunter2",
      "session-token",
      "otp-pepper",
      "hidden-value",
      "compound-key",
      "compound-token",
      "listed-secret",
      "refresh-value",
      "cookie-value",
    ]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("A10235");
    expect(text).toContain("[redacted]");
  });

  it("masks the password in database URLs and keeps the rest", () => {
    const { logger, output } = capture();

    logger.info(
      {
        databaseUrl:
          "postgres://support_agent.ref:hunter2@pooler.example.com:6543/postgres",
      },
      "connect failed for postgresql://postgres:p%40ss@127.0.0.1:54322/postgres",
    );

    const text = output();
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("p%40ss");
    expect(text).toContain(
      "postgres://support_agent.ref:[redacted]@pooler.example.com:6543/postgres",
    );
    expect(text).toContain("postgresql://postgres:[redacted]@127.0.0.1:54322");
  });

  it("masks secrets in a line that is not JSON", () => {
    const line = redactLogLine(`raw ${NACE_KEY} postgres://u:hunter2@db/x\n`);

    expect(line).toBe("raw [redacted] postgres://u:[redacted]@db/x\n");
  });
});

describe("IF-DREX-7 NFR-OBS-1 logger keeps usage counters", () => {
  it("leaves token usage counters visible", () => {
    const { logger, output } = capture();

    logger.info({
      request_id: "req_123",
      input_tokens: 301,
      output_tokens: 12,
      max_tokens: 100,
      inputTokens: 302,
      usage: { input_tokens: 303 },
      order: "A10236",
    });

    const text = output();
    expect(text).toContain('"request_id":"req_123"');
    expect(text).toContain('"input_tokens":301');
    expect(text).toContain('"output_tokens":12');
    expect(text).toContain('"max_tokens":100');
    expect(text).toContain('"inputTokens":302');
    expect(text).toContain('"usage":{"input_tokens":303}');
    expect(text).toContain("A10236");
  });
});
