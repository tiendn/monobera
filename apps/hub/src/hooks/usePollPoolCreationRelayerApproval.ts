import {
  balancerVaultAbi,
  useBeraJs,
  type DefaultHookOptions,
} from "@bera/berajs";
import { balancerPoolCreationHelper, balancerVaultAddress } from "@bera/config";
import useSWR, { mutate } from "swr";
import { Abi } from "viem";
import { usePublicClient } from "wagmi";

/**
 * Hook for fetching relayer approval status with SWR
 *
 * @returns SWR data spread and refresh function
 */
export const usePollPoolCreationRelayerApproval = (
  options?: DefaultHookOptions,
) => {
  const { account } = useBeraJs();
  const publicClient = usePublicClient();

  const QUERY_KEY =
    account && balancerVaultAddress && balancerPoolCreationHelper
      ? [
          account,
          balancerVaultAddress.toLowerCase(),
          balancerPoolCreationHelper.toLowerCase(),
          "setRelayerApproval",
        ]
      : null;

  const swrResponse = useSWR<boolean>(
    QUERY_KEY,
    async () => {
      try {
        if (!publicClient) throw new Error("Public client not available");
        const approved = await publicClient.readContract({
          address: balancerVaultAddress,
          abi: balancerVaultAbi as Abi,
          functionName: "hasApprovedRelayer",
          args: [account, balancerPoolCreationHelper],
        });
        return Boolean(approved);
      } catch (error) {
        console.error("Failed to fetch relayer approval status:", error);
        return false;
      }
    },
    { ...options?.opts },
  );

  const refreshPoolCreationApproval = () => {
    if (QUERY_KEY) {
      mutate(QUERY_KEY);
    }
  };

  return { ...swrResponse, refreshPoolCreationApproval };
};
