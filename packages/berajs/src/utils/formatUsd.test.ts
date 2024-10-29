import { describe, expect, test } from "@jest/globals";

import { formatUsd } from "./formatUsd";

describe("formatUsd with en-US locale", () => {
  test("should format numbers as USD currency", () => {
    expect(formatUsd(1234.56)).toBe("$1,234.56");
  });

  test("should format strings as USD currency", () => {
    expect(formatUsd("1234.56")).toBe("$1,234.56");
  });

  test("should return $0.00 for invalid inputs", () => {
    expect(formatUsd("abc")).toBe("$0.00");
    expect(formatUsd({} as any)).toBe("$0.00");
  });
});
