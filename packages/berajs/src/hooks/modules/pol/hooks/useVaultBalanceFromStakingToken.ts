import { beraChefAddress } from "@bera/config";
import useSWR from "swr";
import { Address, formatEther } from "viem";
import { usePublicClient } from "wagmi";

import { BERA_CHEF_ABI, BERA_VAULT_REWARDS_ABI } from "~/abi";
import { useBeraJs } from "~/contexts";
import { useRewardVaultFromToken } from "./useRewardVaultFromToken";

export const useVaultBalanceFromStakingToken = ({
  stakingToken,
  rewardVaultAddress: _rewardVaultAddress,
}: {
  stakingToken: Address;
  rewardVaultAddress?: Address;
}) => {
  const { account } = useBeraJs();
  const client = usePublicClient();

  const { data: rewardVaultAddress = _rewardVaultAddress, error } =
    useRewardVaultFromToken({
      tokenAddress: stakingToken,
    });

  return useSWR(
    rewardVaultAddress
      ? ["useVaultBalanceFromStakingToken", rewardVaultAddress, account]
      : null,

    async () => {
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
        rewardVaultAddress,
        isWhitelisted,
        balance: balance ? formatEther(balance) : undefined,
      };
    },
  );
};
