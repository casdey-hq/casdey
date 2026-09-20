import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests only, and only for the logic where a quiet bug is expensive:
 * who counts as dormant, and how a CSV row becomes a patient. Both decide who
 * gets emailed. Rendering is verified in the browser instead, with one
 * exception since 2026-09-20: markdown-lite, which turns casdey HQ notes into
 * elements, silently shredded every hard-wrapped bullet and nobody noticed for
 * a week. Pure input to output, so a .tsx test earns its place.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Lets server-only modules be unit-tested; see test/server-only-stub.ts.
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
