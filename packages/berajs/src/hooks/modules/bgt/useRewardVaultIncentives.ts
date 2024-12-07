import useSWR from "swr";
import { Address } from "viem";
import { usePublicClient } from "wagmi";

import { getRewardVaultIncentives } from "~/actions/bgt/getRewardVaultIncentives";

export const useRewardVaultIncentives = ({ address }: { address: Address }) => {
  const publicClient = usePublicClient();

  const QUERY_KEY = publicClient ? ["useRewardVaultIncentives", address] : null;

  return useSWR(QUERY_KEY, async () => {
    return await getRewardVaultIncentives(address, publicClient!);
  });
};
