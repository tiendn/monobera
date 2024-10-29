import { describe, expect, test } from "@jest/globals";
import { encrypt, decrypt } from "./encoder";

describe("Encoder Utils", () => {
  const message = "Hello, World!";
  const key = "secretkey123";

  test("encrypt should return a non-empty string", () => {
    const cipherText = encrypt(message, key);
    expect(typeof cipherText).toBe("string");
    expect(cipherText.length).toBeGreaterThan(0);
  });

  test("decrypt should return the original message with 0x prefix", () => {
    const cipherText = encrypt(message, key);
    const decryptedMessage = decrypt(cipherText, key);
    expect(decryptedMessage).toBe(`0x${message}`);
  });

  test('decrypt should return "0x" for invalid cipher', () => {
    const invalidCipher = "invalidciphertext";
    const result = decrypt(invalidCipher, key);
    expect(result).toBe("0x");
  });
});
