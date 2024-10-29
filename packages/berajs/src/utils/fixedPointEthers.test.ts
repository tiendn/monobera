import { describe, expect, test } from "@jest/globals";
import {
  toQ64,
  fromQ64,
  toQ48,
  fromQ48,
  toSqrtPrice,
  fromSqrtPrice,
} from "./fixedPointEthers";
import { BigNumber } from "ethers";

describe("Fixed Point Ethers Utils", () => {
  test("toQ64 and fromQ64 should correctly convert values", () => {
    const value = 123.456;
    const q64Value = toQ64(value);
    const result = fromQ64(q64Value);
    expect(result).toBeCloseTo(value, 5);
  });

  test("toQ48 and fromQ48 should correctly convert values", () => {
    const value = 789.012;
    const q48Value = toQ48(value);
    const result = fromQ48(q48Value);
    expect(result).toBeCloseTo(value, 5);
  });

  test("toSqrtPrice and fromSqrtPrice should correctly convert values", () => {
    const price = 10000;
    const sqrtPrice = toSqrtPrice(price);
    const result = fromSqrtPrice(BigNumber.from(sqrtPrice));
    expect(result).toBeCloseTo(price, 5);
  });
});
