import { defineConfig } from "vitest/config";

const live = process.env.NACE_LIVE === "1";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "live",
          include: live ? ["tests/live/**/*.test.ts"] : [],
          environment: "node",
          passWithNoTests: true,
        },
      },
    ],
  },
});
