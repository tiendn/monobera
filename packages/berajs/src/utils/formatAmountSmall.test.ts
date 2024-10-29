import { describe, expect, test } from "@jest/globals";

import { formatAmountSmall } from "./formatAmountSmall";

describe("formatAmountSmall", () => {
  test("should return isSmall as false and numericValue as 0 for NaN or zero", () => {
    expect(formatAmountSmall("abc")).toEqual({
      isSmall: false,
      numericValue: 0,
    });
    expect(formatAmountSmall(0)).toEqual({ isSmall: false, numericValue: 0 });
  });

  test("should return isSmall as true for values less than 0.01", () => {
    expect(formatAmountSmall(0.005)).toEqual({
      isSmall: true,
      numericValue: 0.01,
    });
  });

  test("should return isSmall as false for values greater than or equal to 0.01", () => {
    expect(formatAmountSmall(0.02)).toEqual({
      isSmall: false,
      numericValue: 0.02,
    });
  });
});
