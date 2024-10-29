import { describe, expect, test } from "@jest/globals";

import { formatNumber } from "./formatNumber";

describe("formatNumber", () => {
  test("should format numbers with default 8 decimals", () => {
    expect(formatNumber(1234.56789)).toBe("1234.56789");
  });

  test("should format numbers with specified decimals", () => {
    expect(formatNumber(1234.56789, 2)).toBe("1234.57");
  });

  test("should remove trailing zeros", () => {
    expect(formatNumber(1234.5)).toBe("1234.5");
    expect(formatNumber(1234.0)).toBe("1234");
  });
});
