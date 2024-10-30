// import { BalancerSDK } from "@balancer-labs/sdk";

import { PoolWithMethods } from "@balancer-labs/sdk";
import useSWR from "swr";

import { balancerClient } from "./balancerClient";

/**
 * @deprecated we should move to query pools from the api
 */
export const usePools = () => {
  return useSWR("pools", async () => {
    const pools = await balancerClient.pools.all();
    return pools;
  });
};
