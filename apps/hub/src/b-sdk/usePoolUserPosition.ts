import {
  DefaultHookOptions,
  DefaultHookReturnType,
  usePollBalance,
  type IUserPosition,
} from "@bera/berajs";
import {
  PoolState,
  PoolStateWithBalances,
} from "@berachain-foundation/berancer-sdk";
import BigNumber from "bignumber.js";

type IUsePoolUserPositionArgs = {
  pool: PoolStateWithBalances | undefined;
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

  return {
    data: {
      lpBalance: userPosition,
      tokenBalances: pool?.tokens.map((token) => {
        const tokenRatioPerLp =
          Number(token.balance) / Number(pool.totalShares);

        const userBalance = BigNumber(userPosition?.formattedBalance ?? "0")
          .times(tokenRatioPerLp)
          .precision(token.decimals);

        return {
          balance: BigInt(
            userBalance
              .times(10 ** token.decimals)
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
