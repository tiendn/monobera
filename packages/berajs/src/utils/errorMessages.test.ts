import { describe, expect, test } from "@jest/globals";

import { getCustomAppErrorMessages, getErrorMessage } from "./errorMessages";

describe("Error Messages Utils", () => {
  test("getCustomAppErrorMessages should return correct error message for PERPS", () => {
    const error = { metaMessages: ["PriceImpactTooHigh"] };
    const message = getCustomAppErrorMessages(error, "PERPS");
    expect(message).toBe("This position causes too much price impact.");
  });

  test("getErrorMessage should return GENERAL_ERROR for unknown error", () => {
    const error = { unknownKey: "unknownValue" };
    const message = getErrorMessage(error);
    expect(message).toBe("Something went wrong. Please try again later.");
  });
});
