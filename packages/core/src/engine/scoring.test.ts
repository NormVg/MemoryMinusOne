import { describe, it, expect } from "vitest";
import { sigmoid } from "./scoring";

describe("scoring", () => {
  describe("sigmoid", () => {
    it("should be bounded between 0 and 1", () => {
      expect(sigmoid(-100)).toBe(0);
      expect(sigmoid(100)).toBe(1);
    });

    it("should map 0 to 0.5", () => {
      expect(sigmoid(0)).toBe(0.5);
    });

    it("should be monotonic", () => {
      const a = sigmoid(-2);
      const b = sigmoid(-1);
      const c = sigmoid(0);
      const d = sigmoid(1);
      const e = sigmoid(2);

      expect(a).toBeLessThan(b);
      expect(b).toBeLessThan(c);
      expect(c).toBeLessThan(d);
      expect(d).toBeLessThan(e);
    });
  });
});
