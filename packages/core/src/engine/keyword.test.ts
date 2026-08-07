import { describe, it, expect } from "vitest";
import { extractKeywords, computeKeywordOverlap, computeBm25Score } from "./keyword";

describe("keyword scoring", () => {
  it("should extract keywords properly including trigrams", () => {
    const text = "hello world";
    const keywords = extractKeywords(text, 3);
    expect(keywords.has("hello")).toBe(true);
    expect(keywords.has("world")).toBe(true);
    expect(keywords.has("hel")).toBe(true); // trigram
    expect(keywords.has("hello_world")).toBe(true); // bigram
  });

  it("should compute BM25 score", () => {
    const query = ["test", "query"];
    const content = ["this", "is", "a", "test", "test", "query"];
    const score = computeBm25Score(query, content);
    expect(score).toBeGreaterThan(0);
  });

  it("should compute keyword overlap", () => {
    const query = new Set(["hello", "world"]);
    const content = new Set(["world"]);
    
    const overlap = computeKeywordOverlap(query, content);
    expect(overlap).toBe(0.5); // 1 match out of 2 total weight
  });
});
