"use client";

import React, { useState } from "react";
import { honeyFactoryAbi } from "@bera/berajs";
import { honeyFactoryAddress } from "@bera/config";
import {
  ApproveButton,
  ConnectButton,
  FormattedNumber,
  SSRSpinner,
  TokenInput,
} from "@bera/shared-ui";
import { Button } from "@bera/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bera/ui/card";
import { Skeleton } from "@bera/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@bera/ui/tabs";
import { parseUnits } from "viem";

import { usePsm } from "~/hooks/usePsm";
import { Icons } from "@bera/ui/icons";
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";

export function SwapCard() {
  const [tabValue, setTabValue] = useState<"mint" | "burn">("mint");
  const {
    fee,
    isFeeLoading,
    payload,
    isReady,
    setSelectedFrom,
    setSelectedTo,
    isLoading,
    write,
    selectedFrom,
    selectedTo,
    fromAmount,
    setFromAmount,
    setToAmount,
    setIsTyping,
    toAmount,
    isMint,
    fromBalance,
    toBalance,
    setGivenIn,
    onSwitch,
    ModalPortal,
    honey,
    collateralList,
    needsApproval,
    refreshAllowances,
    exceedBalance,
    isTyping,
    isBadCollateral,
    isBasketModeEnabled,
  } = usePsm();

  return (
    <div className="w-full">
      <Card className="relative z-10 m-auto block w-full max-w-[500px] bg-background shadow-2xl">
        {ModalPortal}
        <CardHeader className="pb-3">
          <CardTitle>
            <span>{isMint ? "Mint" : "Redeem"}</span>
            {isFeeLoading ? (
              <Skeleton className="absolute right-6 top-5 h-6 w-40" />
            ) : (
              <div className="absolute right-6 top-5 text-base font-medium text-muted-foreground">
                Static fee of <FormattedNumber value={fee ?? 0} percent />
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={tabValue} value={tabValue} className="mb-3">
            <TabsList className="w-full">
              <TabsTrigger
                value={"mint"}
                className="flex-1 capitalize"
                onClick={() => {
                  setTabValue("mint");
                  if (!isMint) onSwitch();
                }}
              >
                Mint
              </TabsTrigger>
              <TabsTrigger
                value={"burn"}
                className="flex-1 capitalize"
                onClick={() => {
                  setTabValue("burn");
                  if (isMint) onSwitch();
                }}
              >
                Redeem
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="border-1 flex flex-col gap-6 border-border">
            <ul className="relative rounded-2xl border">
              <TokenInput
                selected={selectedFrom?.[0]}
                selectedTokens={selectedFrom}
                onTokenSelection={(token) =>
                  setSelectedFrom((prevToken) =>
                    token && prevToken && prevToken[1]
                      ? [token, prevToken?.[1]]
                      : [],
                  )
                }
                amount={fromAmount[0]}
                balance={fromBalance?.[0]}
                selectable={selectedFrom?.[0]?.address !== honey?.address}
                customTokenList={collateralList}
                showExceeding
                setIsTyping={setIsTyping}
                setAmount={(amount) => {
                  setGivenIn(true);
                  setFromAmount((prevAmount) => [amount, prevAmount[1]]);
                }}
              />
              <hr />
              {!!isBasketModeEnabled && tabValue === "mint" && (
                <>
                  <TokenInput
                    selected={selectedFrom?.[1]}
                    selectedTokens={selectedFrom}
                    onTokenSelection={(token) =>
                      setSelectedFrom((prevToken) =>
                        token && prevToken ? [prevToken[0], token] : [],
                      )
                    }
                    amount={fromAmount[1]}
                    balance={fromBalance?.[1]}
                    selectable={selectedFrom?.[1]?.address !== honey?.address}
                    customTokenList={collateralList}
                    showExceeding
                    setIsTyping={setIsTyping}
                    setAmount={(amount) => {
                      setGivenIn(true);
                      setFromAmount((prevAmount) => [prevAmount[0], amount]);
                    }}
                  />
                  <hr />
                </>
              )}
              {(isLoading || isTyping) && (
                <SSRSpinner className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] rounded-md border border-border bg-background p-2" />
              )}
              <TokenInput
                selected={selectedTo?.[0]}
                selectedTokens={selectedTo}
                setIsTyping={setIsTyping}
                amount={toAmount[0]}
                setAmount={(amount) => {
                  setGivenIn(false);
                  setToAmount((prevAmount) => [amount, prevAmount[1]]);
                }}
                selectable={selectedTo?.[0]?.address !== honey?.address}
                customTokenList={collateralList}
                showExceeding={false}
                hideMax={true}
                balance={toBalance?.[0]}
                onTokenSelection={(token) =>
                  setSelectedTo((prevToken) =>
                    token && prevToken ? [token, prevToken[1]] : [],
                  )
                }
              />
              {!!isBasketModeEnabled && tabValue === "burn" && (
                <>
                  <hr />
                  <TokenInput
                    selected={selectedTo?.[1]}
                    selectedTokens={selectedTo}
                    onTokenSelection={(token) =>
                      setSelectedTo((prevToken) =>
                        token && prevToken ? [prevToken[0], token] : [],
                      )
                    }
                    amount={toAmount[1]}
                    balance={toBalance?.[1]}
                    selectable={selectedTo?.[1]?.address !== honey?.address}
                    customTokenList={collateralList}
                    showExceeding
                    setIsTyping={setIsTyping}
                    setAmount={(amount) => {
                      setGivenIn(false);
                      setFromAmount((prevAmount) => [prevAmount[0], amount]);
                    }}
                  />
                </>
              )}
            </ul>
            {isBadCollateral.some((item) => item !== undefined) &&
            (isBadCollateral.some((item) => item?.isBlacklisted) ||
              isBadCollateral.some((item) => item?.isDepegged)) &&
            !isBasketModeEnabled ? (
              <Alert variant="default" className="flex gap-2">
                <Icons.info className="h-4 w-4 flex-shrink-0 text-default-foreground" />
                <div>
                  <AlertTitle className="text-destructive-foreground">
                    Selected token disabled
                  </AlertTitle>
                  <AlertDescription className="text-sm text-muted-foreground">
                    Selected token is currently{" "}
                    {isBadCollateral?.some((item) => item?.isBlacklisted)
                      ? "blacklisted"
                      : "depegged"}
                    .
                  </AlertDescription>
                </div>
              </Alert>
            ) : isBasketModeEnabled ? (
              <Alert variant="default" className="flex gap-2">
                <Icons.info className="h-4 w-4 flex-shrink-0 text-default-foreground" />
                <div>
                  <AlertTitle className="text-destructive-foreground">
                    Minting is currently restricted to preset pairs
                  </AlertTitle>
                  <AlertDescription className="text-sm text-muted-foreground">
                    Restrictions in effect due to price volatility.
                  </AlertDescription>
                </div>
              </Alert>
            ) : null}
            {!isReady ? (
              <ConnectButton className="w-full" />
            ) : needsApproval.length > 0 &&
              !exceedBalance.some((item) => item) ? (
              <ApproveButton
                token={needsApproval[0]}
                spender={honeyFactoryAddress}
                amount={parseUnits(
                  needsApproval[0].amount ?? "0",
                  needsApproval[0].decimals ?? 18,
                )}
                onApproval={() => refreshAllowances()}
              />
            ) : (
              <Button
                disabled={
                  isLoading ||
                  fromAmount.every((item) => item === "0") ||
                  toAmount.every((item) => item === "0") ||
                  exceedBalance.some((item) => item) ||
                  isTyping ||
                  (!isBasketModeEnabled &&
                    isBadCollateral.some((item) => item !== undefined) &&
                    (isBadCollateral.some((item) => item?.isBlacklisted) ||
                      isBadCollateral.some((item) => item?.isDepegged))) ||
                  !payload
                }
                onClick={() => {
                  write({
                    address: honeyFactoryAddress,
                    abi: honeyFactoryAbi,
                    functionName: isMint ? "mint" : "redeem",
                    params: payload!,
                  });
                }}
              >
                {isMint ? "Mint" : "Redeem"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
