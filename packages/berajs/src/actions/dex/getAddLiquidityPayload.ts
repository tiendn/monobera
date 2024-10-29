import { nativeTokenAddress } from "@bera/config";
import { Address } from "viem";

import { AddLiquidityRequest, PayloadReturnType } from "~/types";

/**
 * generates a payload used to add liquidity to bex
 */

export const getAddLiquidityPayload = async ({
  args,
}: {
  args: AddLiquidityRequest;
}): Promise<PayloadReturnType | undefined> => {
  return undefined;
};
