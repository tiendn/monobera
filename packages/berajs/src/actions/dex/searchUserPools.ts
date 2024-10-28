import { ApolloClient, InMemoryCache } from "@apollo/client";
import { decodeCrocPrice } from "@bera/beracrocswap";
import { chainId, crocQueryAddress, multicallAddress } from "@bera/config";
import { GetUserPools } from "@bera/graphql";
import BigNumber from "bignumber.js";
import { BigNumber as EthersBigNumber } from "ethers";
import {
  Address,
  PublicClient,
  erc20Abi,
  formatUnits,
  getAddress,
  parseUnits,
  toHex,
} from "viem";

import { BERA_VAULT_REWARDS_ABI, bexQueryAbi } from "~/abi";
import { ADDRESS_ZERO } from "~/config";
import { BeraConfig, IUserPool, IUserPosition, PoolV2 } from "~/types";
import { mapPoolToPoolV2 } from "~/utils";

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
  const decodedSpotPrice = decodeCrocPrice(
    EthersBigNumber.from(price.toString()),
  );
  const sqrtPrice = Math.sqrt(decodedSpotPrice);

  const liq = new BigNumber(seeds.toString());
  const baseAmount = liq.times(sqrtPrice);
  const quoteAmount = liq.div(sqrtPrice);

  return {
    baseAmount,
    quoteAmount,
  };
};
