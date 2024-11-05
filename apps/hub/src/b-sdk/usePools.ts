// import { BalancerSDK } from "@balancer-labs/sdk";
import useSWR from "swr";

import { balancerClient } from "./balancerClient";

export const usePools = () => {
  return useSWR("pools", async () => {
    const pools = await balancerClient.pools.all();
    console.log("USEPOOLS", pools);
    return pools;
  });
};
