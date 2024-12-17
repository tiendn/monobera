import { balancerApiChainName } from "@bera/config";
import { bexApiGraphqlClient } from "@bera/graphql";
import {
  GetRewardVaultByAddress,
  GetRewardVaultByAddressQuery,
  GetRewardVaultByAddressQueryVariables,
  GqlChain,
  GqlRewardVault,
} from "@bera/graphql/dex/api";
import useSWR from "swr";

import POLLING from "~/enum/polling";

// Ensure the query is imported from the correct location

export const useRewardVaultsDynamicData = (
  vaultAddresses: string[] | undefined,
) => {
  return useSWR<GqlRewardVault[]>(
    vaultAddresses ? ["useRewardVaults", vaultAddresses] : null,
    async () => {
      if (!vaultAddresses || vaultAddresses.length === 0) return [];

      // Fetch each vault individually since `where` only supports a single vaultAddress
      const results = await Promise.all(
        vaultAddresses.map(async (vaultAddress) => {
          const response = await bexApiGraphqlClient.query<
            GetRewardVaultByAddressQuery,
            GetRewardVaultByAddressQueryVariables
          >({
            query: GetRewardVaultByAddress,
            variables: {
              chain: balancerApiChainName as GqlChain,
              vaultAddress,
            },
          });

          console.log("QUERY VAULT", vaultAddress, response);

          if (response.errors) {
            throw new Error(response.errors[0].message);
          }

          // Return the first (and only) result for the vault FIXME: would be nice to get many at once....
          return response.data.polGetRewardVaults[0];
        }),
      );

      // Filter out any null or undefined results
      return results.filter(Boolean) as GqlRewardVault[];
    },
    {
      refreshInterval: POLLING.SLOW,
    },
  );
};
