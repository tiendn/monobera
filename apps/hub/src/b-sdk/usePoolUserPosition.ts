import { PoolWithMethods } from "@balancer-labs/sdk";
import {
  DefaultHookOptions,
  DefaultHookReturnType,
  usePollBalance,
  type IUserPosition,
} from "@bera/berajs";
import BigNumber from "bignumber.js";

type IUsePoolUserPositionArgs = {
  pool: PoolWithMethods | undefined;
};

/**
 * Given a pool and used within an initialized viem context, returns the user's position
 */
export const usePoolUserPosition = (
  { pool }: IUsePoolUserPositionArgs,
  options?: DefaultHookOptions,
): DefaultHookReturnType<IUserPosition> => {
  const { data: userPosition, ...rest } = usePollBalance({
    address: pool?.address,
  });

  const tokenRatioPerLp =
    Number(userPosition?.formattedBalance) / Number(pool?.totalShares);

  return {
    data: {
      userSharePercentage: tokenRatioPerLp,
      lpBalance: userPosition,
      tokenBalances: pool?.tokens.map((token) => {
        const userBalance = BigNumber(token.balance ?? "0")
          .times(tokenRatioPerLp)
          .precision(token.decimals!);

        return {
          balance: BigInt(
            userBalance
              .times(10 ** token.decimals!)
              .toFixed(0)
              .toString(),
          ),
          formattedBalance: userBalance.toString(),
        };
      }),
    },
    ...rest,
    refresh: () => {
      rest.refresh?.();
    },
  };
};
