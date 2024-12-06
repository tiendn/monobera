import useSWR from "swr";
import { Address } from "viem";
import { usePublicClient } from "wagmi";

import { getRewardVaultIncentives } from "~/actions/bgt/getRewardVaultIncentives";

export const useRewardVaultIncentives = (gaugeAddress: Address) => {
  const publicClient = usePublicClient();

  return useSWR([], async () => {
    return await getRewardVaultIncentives(gaugeAddress, publicClient!);
  });
};
