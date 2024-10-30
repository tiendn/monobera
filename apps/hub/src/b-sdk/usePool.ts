import useSWR from "swr";

import { balancerApi } from "./b-sdk";

export const usePool = ({ id }: { id: string }) => {
  return useSWR(`pool-${id}`, async () => {
    try {
      const [v2Pool, v3Pool] = await Promise.all([
        undefined, // balancerClient.pools.find(id),
        balancerApi.pools.fetchPoolStateWithBalances(id),
      ]);
      return { v2Pool, v3Pool };
    } catch (error) {
      console.error("USEPOOLERROR", error);
      throw error;
    }
  });
};
