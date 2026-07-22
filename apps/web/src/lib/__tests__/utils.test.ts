import { describe, expect, it } from "vitest";
import { cn, formatBytes, formatNumber, truncate, initials, clamp } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4")).toContain("px-4");
    expect(cn("text-red-500", false, undefined, "font-bold")).toBe("text-red-500 font-bold");
  });
});

describe("formatBytes", () => {
  it("returns human-friendly sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1_500_000, 1)).toBe("1.4 MB");
  });
});

describe("formatNumber", () => {
  it("formats with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("truncate", () => {
  it("truncates long strings with ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("short", 20)).toBe("short");
  });
});

describe("initials", () => {
  it("returns up to two uppercase letters", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("krishna")).toBe("K");
  });
});

describe("clamp", () => {
  it("clamps values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
