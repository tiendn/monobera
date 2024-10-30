// import { BalancerSDK } from "@balancer-labs/sdk";
import useSWR from "swr";

// import { balancerClient } from "~/actions";

export const usePools = () => {
  return useSWR("pools", async () => {
    try {
      // return await balancerClient.pools.all();
      return undefined;
    } catch (error) {
      console.error("USEPOOLSERROR", error);
      throw error;
    }
  });
};
