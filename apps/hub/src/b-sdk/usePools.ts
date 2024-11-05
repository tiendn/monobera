import { PoolWithMethods } from "@balancer-labs/sdk";
import useSWR from "swr";

import { balancerClient } from "./balancerClient";

/**
 * @deprecated we should move to query pools from the api
 */
export const usePools = () => {
  // TODO: we should use v3 SDK here instead for better typing on the returned pools
  return useSWR("pools", async () => {
    const pools = await balancerClient.pools.all();
    return pools;
  });
};
