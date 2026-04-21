import { describe, it, expect } from "vitest";
import { escapeIlike, sanitizeOrQuery, pluralize } from "@/lib/search-utils";

describe("escapeIlike", () => {
  it("escapes % character", () => {
    expect(escapeIlike("100%")).toBe("100\\%");
  });

  it("escapes _ character", () => {
    expect(escapeIlike("foo_bar")).toBe("foo\\_bar");
  });

  it("escapes backslash", () => {
    expect(escapeIlike("path\\to")).toBe("path\\\\to");
  });

  it("escapes multiple special characters", () => {
    expect(escapeIlike("50%_off\\deal")).toBe("50\\%\\_off\\\\deal");
  });

  it("leaves normal text unchanged", () => {
    expect(escapeIlike("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeIlike("")).toBe("");
  });

  it("handles Polish characters", () => {
    expect(escapeIlike("sztuczna inteligencja żółć")).toBe("sztuczna inteligencja żółć");
  });
});

describe("sanitizeOrQuery", () => {
  it("strips PostgREST or-syntax punctuation", () => {
    expect(sanitizeOrQuery("foo,bar")).toBe("foo bar");
    expect(sanitizeOrQuery("foo(bar)")).toBe("foo bar ");
  });

  it("still escapes ilike metacharacters", () => {
    expect(sanitizeOrQuery("50%_off")).toBe("50\\%\\_off");
  });

  it("escapes metacharacters even when paired with punctuation", () => {
    expect(sanitizeOrQuery("foo%,bar_")).toBe("foo\\% bar\\_");
  });
});

describe("pluralize (search results)", () => {
  it("returns singular for 1", () => {
    expect(pluralize(1)).toBe("wynik");
  });

  it("returns nominative plural for 2-4", () => {
    expect(pluralize(2)).toBe("wyniki");
    expect(pluralize(3)).toBe("wyniki");
    expect(pluralize(4)).toBe("wyniki");
  });

  it("returns genitive plural for 0 and 5+", () => {
    expect(pluralize(0)).toBe("wyników");
    expect(pluralize(5)).toBe("wyników");
    expect(pluralize(10)).toBe("wyników");
    expect(pluralize(100)).toBe("wyników");
  });
});
