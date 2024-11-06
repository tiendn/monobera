import {
  IContractWrite,
  balancerVaultAbi,
  useBeraJs,
  type DefaultHookOptions,
  type DefaultHookReturnType,
} from "@bera/berajs";
import {
  balancerPoolCreationHelper,
  balancerRelayerAddress,
  balancerVaultAddress,
} from "@bera/config";
import { useTxn } from "@bera/shared-ui";
import useSWR, { mutate } from "swr";
import { Abi } from "viem";
import { usePublicClient } from "wagmi";

/**
 * @brief Hook for handling relayer approval
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
  refresh: () => void;
  swr: DefaultHookReturnType<boolean>;
} => {
  const { account } = useBeraJs();
  const publicClient = usePublicClient();

  const QUERY_KEY =
    account && balancerRelayerAddress && balancerPoolCreationHelper
      ? ([
          account,
          balancerRelayerAddress.toLowerCase(),
          balancerPoolCreationHelper.toLowerCase(),
          "setRelayerApproval",
        ] as const)
      : undefined;

  const { write, ModalPortal, isSuccess, isError, isLoading } = useTxn({
    message: "Approving the Pool Creation Helper...",
  });

  const writeApproval = async () => {
    write({
      address: balancerVaultAddress,
      abi: balancerVaultAbi as unknown as Abi,
      functionName: "setRelayerApproval" as const,
      params: [account as `0x${string}`, balancerPoolCreationHelper, true],
    });
  };

  const swrResponse = useSWR<boolean>(
    QUERY_KEY,
    async () => {
      try {
        if (!publicClient) {
          throw new Error("Public client not available");
        }
        const approved = await publicClient.readContract({
          address: balancerRelayerAddress,
          abi: balancerVaultAbi,
          functionName: "hasApprovedRelayer",
          args: [account, balancerPoolCreationHelper],
        });
        return Boolean(approved); // NOTE: wagmi ought to type this properly but i'm not seeing it.
      } catch (error) {
        console.error("Failed to fetch relayer approval status:", error);
        return false;
      }
    },
    { ...options?.opts },
  );

  const enhancedSwrResponse: DefaultHookReturnType<boolean> = {
    ...swrResponse,
    refresh: () => mutate(QUERY_KEY),
  };

  return {
    swr: enhancedSwrResponse,
    writeApproval,
    ModalPortal,
    isLoading,
    isError,
    isSuccess,
    refresh: enhancedSwrResponse.refresh,
  };
};
