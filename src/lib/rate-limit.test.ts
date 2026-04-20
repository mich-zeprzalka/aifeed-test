import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  const config = { limit: 3, windowMs: 10_000 };

  it("allows requests within limit", () => {
    const key = `test-allow-${Date.now()}`;
    const r1 = rateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, config);
    rateLimit(key, config);
    rateLimit(key, config);

    const r4 = rateLimit(key, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("isolates different keys", () => {
    const key1 = `test-iso-a-${Date.now()}`;
    const key2 = `test-iso-b-${Date.now()}`;

    rateLimit(key1, config);
    rateLimit(key1, config);
    rateLimit(key1, config);

    const r = rateLimit(key2, config);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("returns resetAt in the future", () => {
    const key = `test-reset-${Date.now()}`;
    const r = rateLimit(key, config);
    expect(r.resetAt).toBeGreaterThan(Date.now());
  });
});
