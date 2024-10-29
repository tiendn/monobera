import { describe, expect, test } from "@jest/globals";

import { TimeFrame, getTime, timeFrameToNumber } from "./timeFrame";

describe("TimeFrame Utils", () => {
  test("should calculate correct time for HOURLY", () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const expectedTime = currentTime - timeFrameToNumber[TimeFrame.HOURLY];
    expect(getTime(TimeFrame.HOURLY)).toBeCloseTo(expectedTime, 1);
  });

  test("should calculate correct time for WEEKLY", () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const expectedTime = currentTime - timeFrameToNumber[TimeFrame.WEEKLY];
    expect(getTime(TimeFrame.WEEKLY)).toBeCloseTo(expectedTime, 1);
  });

  test("should calculate correct time for MONTHLY", () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const expectedTime = currentTime - timeFrameToNumber[TimeFrame.MONTHLY];
    expect(getTime(TimeFrame.MONTHLY)).toBeCloseTo(expectedTime, 1);
  });

  test("should calculate correct time for QUARTERLY", () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const expectedTime = currentTime - timeFrameToNumber[TimeFrame.QUARTERLY];
    expect(getTime(TimeFrame.QUARTERLY)).toBeCloseTo(expectedTime, 1);
  });
});
