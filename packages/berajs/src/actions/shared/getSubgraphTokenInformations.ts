import { ApolloClient, InMemoryCache } from "@apollo/client";
import { GetTokenInformations } from "@bera/graphql";
import { getAddress } from "viem";

import type { BeraConfig, Token } from "~/types";
import { getSafeNumber, handleNativeBera } from "~/utils";

interface FetchSubgraphTokenInformationsArgs {
  tokenAddresses?: string[] | undefined;
  config: BeraConfig;
}

export interface SubgraphTokenInformations {
  [key: string]: number; // aka Token.USDValue
}
/**
 * fetch the current honey prices of a series of tokens
 */

// NOTE: the name of this is a bit misleading, we dont return anything more than just the USD value of that token.
export const getSubgraphTokenInformations = async ({
  tokenAddresses,
  config,
}: FetchSubgraphTokenInformationsArgs): Promise<
  SubgraphTokenInformations | undefined
> => {
  if (!config.subgraphs?.dexSubgraph) {
    throw new Error("dex subgraph uri s not found in config");
  }
  const subgraphEndpoint = config.subgraphs?.dexSubgraph;
  const dexClient = new ApolloClient({
    uri: subgraphEndpoint,
    cache: new InMemoryCache(),
  });

  if (!tokenAddresses || tokenAddresses.some((token) => token === undefined)) {
    return {};
  }
  const swappedAddresses = tokenAddresses.map((token: string | undefined) =>
    handleNativeBera(token).toLowerCase(),
  );
  try {
    const res = await dexClient.query({
      query: GetTokenInformations,
      variables: {
        id: swappedAddresses,
      },
    });

    return res.data?.tokenInformations.reduce(
      (allPrices: SubgraphTokenInformations, tokenInformation: Token) => {
        if (!tokenInformation.usdValue) return allPrices; // NOTE: we Skip tokens without a defined usdValue
        return {
          ...allPrices,
          [getAddress(tokenInformation.address)]: getSafeNumber(
            tokenInformation.usdValue,
          ),
        };
      },
      {},
    );
  } catch (e) {
    console.log(e);
    return undefined;
  }
};
