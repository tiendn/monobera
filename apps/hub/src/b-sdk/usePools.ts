// import { BalancerSDK } from "@balancer-labs/sdk";
import useSWR from "swr";

import { balancerClient } from "./balancerClient";
import { balancerSdkConfig } from "./v2-config";

export const usePools = () => {
  return useSWR("pools", async () => {
    try {
      return await balancerClient.pools.all();
    } catch (error) {
      console.error("USEPOOLSERROR", error);
      throw error;
    }
  });
};
