import {
  balancerVaultAbi,
  useBeraJs,
  type DefaultHookOptions,
} from "@bera/berajs";
import { balancerPoolCreationHelper, balancerVaultAddress } from "@bera/config";
import { useTxn } from "@bera/shared-ui";
import useSWR, { SWRResponse, mutate } from "swr";
import { Abi } from "viem";
import { usePublicClient } from "wagmi";

/**
 * Hook for handling relayer approval with SWR
 *
 * @returns State and handler for initiating relayer approval
 */
export const usePoolCreationRelayerApproval = (
  options?: DefaultHookOptions,
): {
  writeApproval: () => Promise<void>;
  ModalPortal: any;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  swr: SWRResponse<boolean> & { isLoading: boolean; isError: boolean };
} => {
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

  const { write, ModalPortal, isSuccess, isError, isLoading } = useTxn({
    message: "Approving the Pool Creation Helper...",
  });

  const writeApproval = async () => {
    if (!account || !balancerVaultAddress) {
      console.error("Missing account or balancerVaultAddress");
      return;
    }
    write({
      address: balancerVaultAddress,
      abi: balancerVaultAbi as Abi,
      functionName: "setRelayerApproval",
      params: [account, balancerPoolCreationHelper, true],
    });
  };

  const swrResponse = useSWR<boolean>(
    QUERY_KEY,
    async () => {
      try {
        if (!publicClient) throw new Error("Public client not available");
        const approved = await publicClient.readContract({
          address: balancerVaultAddress,
          abi: balancerVaultAbi,
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

  return {
    swr: {
      ...swrResponse,
      isLoading:
        !swrResponse.data && !swrResponse.error && swrResponse.isValidating,
      isError: Boolean(swrResponse.error),
    },
    writeApproval,
    ModalPortal,
    isLoading,
    isError,
    isSuccess,
  };
};
