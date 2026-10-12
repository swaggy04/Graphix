
import { describe, expect, it } from "vitest";

describe("Grapix frontend test setup", () => {
  it("runs tests in a browser-like environment", () => {
    expect(typeof window).toBe("object");
    expect(document.createElement("div")).toBeInstanceOf(HTMLElement);
  });
});
