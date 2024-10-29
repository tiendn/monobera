import { useEffect, useState } from "react";
import { crocMultiSwapAddress, nativeTokenAddress } from "@bera/config";
import {
  ContractFunctionArgs,
  EstimateContractGasParameters,
  formatEther,
  parseEther,
  type FeeValues,
} from "viem";
import { usePublicClient } from "wagmi";

export enum TXN_GAS_USED_ESTIMATES {
  SWAP = 250000,
  WRAP = 100000,
  SIMPLE = 25000,
}

const getContractGasEstimate = async (
  publicClient: ReturnType<typeof usePublicClient>,
  contractArgs: any,
  gasUsedOverride?: number,
) => {
  const feesPerGasEstimate = await publicClient?.estimateFeesPerGas();
  const gas = gasUsedOverride
    ? BigInt(gasUsedOverride)
    : await publicClient?.estimateContractGas({ ...(contractArgs as any) });
  const estimatedTxFeeInBera =
    feesPerGasEstimate?.maxPriorityFeePerGas &&
    gas &&
    parseFloat(`${feesPerGasEstimate.maxPriorityFeePerGas * gas}`);
  return estimatedTxFeeInBera
    ? {
        estimatedTxFeeInBera: parseFloat(
          formatEther(BigInt(estimatedTxFeeInBera)),
        ),
      }
    : undefined;
};

interface UseGasDataReturnType {
  estimatedBeraFee: number | undefined;
}

/**
 * Hook that returns estimated gas data, for a general unspecified transaction or a specific one.
 * When contract args are provided, performs a more exact estimate, performs an inaccurate estimation if not.
 * @param {ContractFunctionArgs} param0.contractArgs - contract args for a transaction that we want to estimate gas for.
 * @returns {UseGasDataReturnType} - returns the estimated gas data
 */
export const useGasData = ({
  contractArgs,
  gasUsedOverride,
}: {
  contractArgs?: EstimateContractGasParameters<any> | null;
  gasUsedOverride?: number;
} = {}): UseGasDataReturnType => {
  const [estimatedBeraFee, setEstimatedBeraFee] = useState<
    number | undefined
  >();

  useEffect(() => {
    console.error(
      "failed to get general gas estimate. this was used with crocswap",
    );
  }, []);

  return { estimatedBeraFee };
};
