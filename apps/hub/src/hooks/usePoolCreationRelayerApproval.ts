import {
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
  // TODO: this ought to be split into two things: a usePoll... and a useApproval...
  const { account } = useBeraJs();
  const publicClient = usePublicClient();

  const QUERY_KEY = [
    account,
    balancerRelayerAddress.toLowerCase(),
    balancerPoolCreationHelper.toLowerCase(),
    "setRelayerApproval",
  ];

  const { write, ModalPortal, isSuccess, isError, isLoading } = useTxn({
    message: "Approving the Pool Creation Helper...",
  });

  const checkApprovalStatus = async () => {
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
      return approved;
    } catch (error) {
      console.error("Failed to fetch relayer approval status:", error);
      return false;
    }
  };

  const writeApproval = async () => {
    write({
      address: balancerVaultAddress,
      abi: balancerVaultAbi,
      functionName: "setRelayerApproval",
      params: [account as `0x${string}`, balancerPoolCreationHelper, true],
    });
  };

  // @ts-ignore typing hell FIXME
  const swrResponse: DefaultHookReturnType<boolean> = useSWR(
    QUERY_KEY,
    checkApprovalStatus,
    {
      ...options?.opts,
    },
  );

  return {
    swr: swrResponse,
    writeApproval,
    ModalPortal,
    isLoading,
    isError,
    isSuccess,
    refresh: () => mutate(QUERY_KEY),
  };
};
