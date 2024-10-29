import BigNumber from "bignumber.js";
import { Address, PublicClient } from "viem";

import { BeraConfig, IUserPool, IUserPosition, PoolV2 } from "~/types";

interface Call {
  abi: any[];
  address: `0x${string}`;
  functionName: string;
  args: any[];
}

interface GetUserPoolsProps {
  args: { account: Address; keyword?: string };
  config: BeraConfig;
  publicClient: PublicClient;
}

export const searchUserPools = async ({
  args: { account, keyword = "" },
  config,
  publicClient,
}: GetUserPoolsProps): Promise<IUserPool[] | undefined> => {
  return [];
};

export const getBaseQuoteAmounts = (seeds: bigint, price: bigint) => {
  const decodedSpotPrice = 0;
  const sqrtPrice = Math.sqrt(decodedSpotPrice);

  const liq = new BigNumber(seeds.toString());
  const baseAmount = liq.times(sqrtPrice);
  const quoteAmount = liq.div(sqrtPrice);

  return {
    baseAmount,
    quoteAmount,
  };
};
