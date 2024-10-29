import { BigNumber } from "ethers";
import { PublicClient } from "viem";

import { clientToProvider } from "~/utils/ethers-client-to-provider";
import { PayloadReturnType, WithdrawLiquidityRequest } from "~/types";

/**
 * generates a payload used to add liquidity to bex
 */
export const getWithdrawLiquidityPayload = async ({
  args,
  publicClient,
}: {
  args: WithdrawLiquidityRequest;
  publicClient: PublicClient | undefined;
}): Promise<PayloadReturnType | undefined> => {
  return undefined;
};
