import { useState } from "react";
import {
  balancerVaultAbi,
  useBeraJs,
  type DefaultHookOptions,
  type DefaultHookReturnType,
} from "@bera/berajs";
import { balancerPoolCreationHelper, balancerVaultAddress } from "@bera/config";
import { useTxn } from "@bera/shared-ui";
import useSWR, { mutate } from "swr";
import { Address } from "viem";
import { usePublicClient } from "wagmi";

export type UseApproveRelayerArgs = {
  relayerAddress: Address;
  poolCreationHelper: Address;
};

/**
 * @brief Hook for handling relayer approval
 *
 * @param relayerAddress The address of the relayer
 * @param poolCreationHelper The address of the PoolCreationHelper contract
 *
 * @returns State and handler for initiating relayer approval
 */
export const usePoolCreationRelayerApproval = (
  { relayerAddress, poolCreationHelper }: UseApproveRelayerArgs,
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
    relayerAddress.toLowerCase(),
    poolCreationHelper.toLowerCase(),
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
        address: relayerAddress,
        abi: balancerVaultAbi,
        functionName: "hasApprovedRelayer",
        args: [account, poolCreationHelper],
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
