import { bexSubgraphClient } from "@bera/graphql";
import {
  GetTokenInformations,
  GetTokenInformationsQuery,
} from "@bera/graphql/dex/subgraph";
import { honeyTokenAddress } from "@bera/config";

import { BeraConfig, Token } from "~/types";
import { handleNativeBera } from "~/utils";

interface FetchHoneyPricesArgs {
  tokenAddresses?: string[] | undefined;
  config: BeraConfig;
}

export interface TokenHoneyPrices {
  [key: string]: string;
}
/**
 * fetch the current honey prices of a series of tokens
 */

export const getTokenHoneyPrices = async ({
  tokenAddresses,
  config,
}: FetchHoneyPricesArgs): Promise<TokenHoneyPrices | undefined> => {
  if (!tokenAddresses || tokenAddresses.some((token) => token === undefined)) {
    return {};
  }
  const swappedAddresses = tokenAddresses.map((token: string | undefined) =>
    handleNativeBera(token).toLowerCase(),
  );
  try {
    const res = await bexSubgraphClient.query<GetTokenInformationsQuery>({
      query: GetTokenInformations,
      variables: {
        pricingAsset: honeyTokenAddress,
        assets: swappedAddresses,
      },
    });
    const prices: TokenHoneyPrices = {};

    for (const tokenPrice of res.data?.tokenPrices || []) {
      if (Object.keys(prices).length === swappedAddresses.length) {
        break;
      }

      if (!Object.hasOwn(prices, tokenPrice.asset)) {
        prices[tokenPrice.asset] = tokenPrice.price;
      }
    }
    return prices;
  } catch (e) {
    console.log(e);
    return undefined;
  }
};
