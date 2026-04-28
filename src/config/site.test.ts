import { describe, it, expect } from "vitest";
import { siteConfig } from "./site";

describe("siteConfig", () => {
  it("has a valid name", () => {
    expect(siteConfig.name).toBe("AiFeed");
  });

  it("has a description", () => {
    expect(siteConfig.description).toBeTruthy();
    expect(siteConfig.description.length).toBeGreaterThan(10);
  });

  it("has a valid URL", () => {
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });

  it("has categories with required fields", () => {
    expect(siteConfig.categories.length).toBeGreaterThan(0);
    for (const cat of siteConfig.categories) {
      expect(cat.name).toBeTruthy();
      expect(cat.slug).toBeTruthy();
      expect(cat.slug).toMatch(/^[a-z0-9-]+$/);
      expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("has unique category slugs", () => {
    const slugs = siteConfig.categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has a links object (values may be empty until accounts exist)", () => {
    // We intentionally allow empty strings so that consuming code (JSON-LD
    // sameAs, share-via parameter) can detect "no profile yet" without
    // pointing at non-existent URLs.
    expect(siteConfig.links).toBeTypeOf("object");
    expect(siteConfig.links).toHaveProperty("twitter");
    expect(siteConfig.links).toHaveProperty("github");
  });
});
