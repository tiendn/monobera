import { beraChefAddress } from "@bera/config";
import useSWR from "swr";
import { Address } from "viem";
import { usePublicClient } from "wagmi";

import { BERA_CHEF_ABI, BERA_VAULT_REWARDS_ABI } from "~/abi";
import { ADDRESS_ZERO } from "~/config";
import { useBeraJs } from "~/contexts";
import { useRewardVaultFromToken } from "./useRewardVaultFromToken";

export const useRewardVaultBalanceFromStakingToken = ({
  stakingToken,
  rewardVaultAddress: _rewardVaultAddress,
}: {
  stakingToken: Address;
  rewardVaultAddress?: Address;
}) => {
  const { account } = useBeraJs();
  const client = usePublicClient();

  const {
    data: rewardVaultAddress = _rewardVaultAddress,
    error,
    mutate: mutateRewardVaultAddress,
  } = useRewardVaultFromToken({
    tokenAddress: stakingToken,
  });

  const swrResponse = useSWR(
    rewardVaultAddress
      ? ["useVaultBalanceFromStakingToken", rewardVaultAddress, account]
      : null,

    async () => {
      if (rewardVaultAddress === ADDRESS_ZERO) {
        return {
          address: rewardVaultAddress,
          isWhitelisted: false,
          balance: undefined,
        };
      }

      const [isWhitelisted, balance] = await Promise.all([
        client?.readContract({
          address: beraChefAddress,
          abi: BERA_CHEF_ABI,
          functionName: "isFriendOfTheChef",
          args: [rewardVaultAddress!],
        }),
        account
          ? client?.readContract({
              address: rewardVaultAddress!,
              abi: BERA_VAULT_REWARDS_ABI,
              functionName: "balanceOf",
              args: [account],
            })
          : undefined,
      ]);

      return {
        address: rewardVaultAddress,
        isWhitelisted,
        balance: balance,
      };
    },
  );

  return {
    ...swrResponse,
    refresh: () => {
      mutateRewardVaultAddress();
      swrResponse.mutate();
    },
  };
};
