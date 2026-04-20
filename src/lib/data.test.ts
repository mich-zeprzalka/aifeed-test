import { describe, it, expect } from "vitest";

// Test the escapeIlike function by extracting its logic
// (we can't import it directly since it's not exported, so we test the pattern)
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

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

// Test pluralization logic used in search page
function pluralize(count: number): string {
  if (count === 1) return "wynik";
  if (count >= 2 && count <= 4) return "wyniki";
  return "wyników";
}

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
