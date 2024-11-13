import React, { useEffect, useMemo, useState } from "react";
import {
  useBeraJs,
  usePollWalletBalances,
  useSubgraphTokenInformation,
  type Token,
} from "@bera/berajs";
import { formatUsd } from "@bera/berajs/utils";
import { TokenIcon } from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Button } from "@bera/ui/button";
import { Icons } from "@bera/ui/icons";
import { Input } from "@bera/ui/input";

import { getSafeNumber } from "~/utils/getSafeNumber";
import { TokenInput } from "~/hooks/useMultipleTokenInput";

type Props = {
  token: TokenInput;
  disabled: boolean;
  onTokenChange: (amount: string, usdValue: string, exceeding: boolean) => void;
};

export default function CreatePoolInitialLiquidityInput({
  token,
  disabled,
  onTokenChange,
}: Props) {
  const { useSelectedWalletBalance } = usePollWalletBalances();
  const tokenBalanceData = useSelectedWalletBalance(token?.address ?? "0x");
  const tokenBalance = Number(tokenBalanceData?.formattedBalance || 0);

  const { isConnected } = useBeraJs();

  // TODO: we probably will need to track USD values in a different place so that we can suggest liquidity inputs that align with token weights and quantities
  const { data: tokenHoneyPrice } = useSubgraphTokenInformation({
    tokenAddress: token?.address,
  });
  const usdPrice = Number(tokenHoneyPrice?.usdValue ?? 0);

  // NOTE: we lift the state up to the parent component because tokens are managed there and used to construct txs
  const handleChange = (newAmount: string) => {
    const curSafeBalance = getSafeNumber(tokenBalanceData?.formattedBalance);
    const curSafeAmount = getSafeNumber(newAmount);
    const exceeding = tokenBalanceData ? curSafeAmount > curSafeBalance : false;
    const usdValue = curSafeAmount * usdPrice;
    onTokenChange(newAmount, usdValue.toString(), exceeding);
  };

  const formattedUsdValue = useMemo(
    () => formatUsd(getSafeNumber(token.amount) * usdPrice),
    [token.amount, usdPrice],
  );

  return (
    <li className="flex w-full flex-col items-center p-4">
      <div className="flex w-full flex-row justify-between">
        <Button
          className="flex h-fit w-fit items-center gap-1 self-start border-border bg-background text-base text-foreground shadow"
          variant="secondary"
        >
          <>
            <TokenIcon address={token?.address ?? ""} symbol={token?.symbol} />
            {token?.symbol}
          </>
        </Button>
        <Input
          disabled={disabled}
          type="number"
          step="any"
          min="0"
          placeholder="0"
          variant="black"
          className={cn(
            "w-full grow border-0 bg-transparent pr-4 text-right text-2xl font-semibold outline-none ring-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
            token.exceeding && "text-destructive-foreground",
          )}
          value={token.amount}
          onChange={(e) => {
            handleChange(e.target.value);
          }}
        />
      </div>
      {isConnected && tokenBalance !== 0 ? (
        <div className="mt-1 h-fit w-full cursor-default">
          <div className="flex w-full items-center justify-between gap-1">
            <div className="flex w-fit flex-row items-center justify-start gap-1 pl-1">
              <Icons.wallet className="h-3 w-3 text-muted-foreground" />
              <p className="w-fit max-w-12 overflow-hidden truncate p-0 text-xs text-muted-foreground sm:max-w-[60px]">
                {tokenBalance ? tokenBalance : "0"}
              </p>
              <p
                className="cursor-pointer select-none self-start text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  !disabled && handleChange(tokenBalance.toString());
                }}
              >
                MAX
              </p>
            </div>
            <div className="flex flex-row gap-1">
              <p className="self-center pr-4  text-xs text-muted-foreground">
                {token.amount !== "0" &&
                  token.amount !== "" &&
                  formattedUsdValue}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
