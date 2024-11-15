import { ApolloClient, InMemoryCache } from "@apollo/client";
import {
  beraTokenAddress,
  bgtTokenAddress,
  honeyTokenAddress,
} from "@bera/config";
import { GetTokenInformation, dexClient } from "@bera/graphql";
import { Address } from "viem";

import { BeraConfig } from "~/types/global";
import { handleNativeBera } from "~/utils";

interface FetchHoneyPriceArgs {
  tokenAddress?: string | undefined;
  config: BeraConfig;
}

/**
 * fetch the current honey price of a given token
 */

export const getTokenHoneyPrice = async ({
  tokenAddress,
  config,
}: FetchHoneyPriceArgs): Promise<string | undefined> => {
  if (!tokenAddress) {
    return "0";
  }
  if (tokenAddress.toLowerCase() === honeyTokenAddress.toLowerCase()) {
    return "1";
  }
  return await dexClient
    .query({
      query: GetTokenInformation,
      variables: {
        id:
          handleNativeBera(tokenAddress as Address).toLowerCase() ===
          bgtTokenAddress.toLowerCase()
            ? beraTokenAddress.toLowerCase()
            : handleNativeBera(tokenAddress as Address).toLowerCase(),
      },
    })
    .then((res: any) => {
      return res.data.tokenInformation.usdValue;
    })
    .catch((e: any) => {
      console.log(e);
      return "0";
    });
};
