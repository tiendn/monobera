import { DefaultHookReturnType } from "@bera/berajs";
import { bexSubgraphClient } from "@bera/graphql";
import {
  GetSubgraphPool,
  GetSubgraphPoolQuery,
  SubgraphPoolFragment,
} from "@bera/graphql/dex/subgraph";
import { POLLING } from "@bera/shared-ui";
import { PoolStateWithBalancesAndDynamicData } from "@berachain-foundation/berancer-sdk";
import useSWR from "swr";

import { balancerApi } from "./b-sdk";

export const usePool = ({
  id,
}: {
  id: string;
}): DefaultHookReturnType<
  [
    SubgraphPoolFragment | undefined,
    PoolStateWithBalancesAndDynamicData | undefined,
  ]
> => {
  const subgraph = useSWR(
    `pool-subgraph-${id}`,
    async () => {
      return bexSubgraphClient.query<GetSubgraphPoolQuery>({
        query: GetSubgraphPool,
        variables: { id },
      });
    },
    {
      refreshInterval: POLLING.NORMAL,
    },
  );

  const v3Pool = useSWR(
    `pool-api-${id}`,
    async () => {
      return balancerApi.pools.fetchPoolStateWithBalances(id);
    },
    {
      refreshInterval: POLLING.NORMAL,
    },
  );

  return {
    isLoading: subgraph.isLoading || v3Pool.isLoading,
    isValidating: subgraph.isValidating || v3Pool.isValidating,

    data: [subgraph.data?.data.pool ?? undefined, v3Pool.data],
    error: subgraph.error || v3Pool.error,
    refresh: () => {
      subgraph.mutate();
      v3Pool.mutate();
    },
  };
};
