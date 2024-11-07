import {
  DefaultHookOptions,
  DefaultHookReturnType,
  usePollBalance,
  type IUserPosition,
} from "@bera/berajs";
import { SubgraphPoolFragment } from "@bera/graphql/dex/subgraph";
import BigNumber from "bignumber.js";

type IUsePoolUserPositionArgs = {
  pool: SubgraphPoolFragment | undefined;
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

  const tokenRatioPerLp = pool?.totalShares
    ? Number(userPosition?.formattedBalance) / Number(pool?.totalShares)
    : 0;

  return {
    data: {
      userSharePercentage: tokenRatioPerLp,
      lpBalance: userPosition,
      tokenBalances: pool?.tokens?.map((token) => {
        const userBalance = BigNumber(token.balance ?? "0")
          .times(tokenRatioPerLp)
          .precision(token.decimals!);

        return {
          balance: userBalance?.isGreaterThan(0)
            ? BigInt(
                userBalance
                  .times(10 ** token.decimals!)
                  .toFixed(0)
                  .toString(),
              )
            : 0n,
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
