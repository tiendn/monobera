import { PoolState } from "@balancer/sdk";
import { balancerApi } from "@bera/berajs/actions";
import useSWRImmutable from "swr/immutable";
import { Address } from "viem";

export const useSelectedPool = (shareAddress: Address) => {
  const QUERY_KEY = ["selectedPool", shareAddress];
  return useSWRImmutable<PoolState | undefined>(
    QUERY_KEY,
    async () => {
      return await balancerApi.pools.fetchPoolState(shareAddress);
    },
    {
      refreshInterval: 0,
    },
  );
};
