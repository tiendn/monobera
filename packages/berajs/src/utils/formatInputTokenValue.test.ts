import { describe, expect, test } from "@jest/globals";
import { formatInputTokenValue } from './formatInputTokenValue';

describe('Format Input Token Value', () => {
  test('should format input value correctly', () => {
    expect(formatInputTokenValue("000123.45")).toBe("123.45");
    expect(formatInputTokenValue("0.123")).toBe("0.123");
    expect(formatInputTokenValue("abc123.45xyz")).toBe("123.45");
    expect(formatInputTokenValue("0")).toBe("0");
    expect(formatInputTokenValue(".45")).toBe("0.45");
  });

  test('should return "0" for null or undefined input', () => {
    expect(formatInputTokenValue(null as any)).toBe("0");
    expect(formatInputTokenValue(undefined as any)).toBe("0");
  });

  test('should handle numeric input correctly', () => {
    expect(formatInputTokenValue(0 as any)).toBe("0");
    expect(formatInputTokenValue(123.45 as any)).toBe("123.45");
  });
});