"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { RouteNotFound } from "@bera/bera-router";
import { DEX_PRECOMPILE_ABI, useBeraJs } from "@bera/berajs";
import { TokenInput, useTxn } from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Button } from "@bera/ui/button";
import { Card, CardTitle } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { type Address } from "wagmi";

import { cloudinaryUrl, erc20DexAddress, erc20ModuleAddress } from "~/config";
import { SwapKind, useSwap } from "~/hooks/useSwap";
import { SettingsPopover } from "./settings-popover";

const DynamicPreview = dynamic(() => import("./preview-dialog"), {
  loading: () => (
    <Button className="w-full gap-1">
      Preview <Icons.arrowRight className="h-3 w-3" />
    </Button>
  ),
  ssr: false,
});

const DynamicApproveButton = dynamic(() => import("./approve-token-button"), {
  loading: () => <p>Loading...</p>,
  ssr: false,
});

const Connect = dynamic(
  () => import("@bera/shared-ui").then((mod) => mod.ConnectButton),
  {
    ssr: false,
    loading: () => (
      <Button className="w-full gap-2 text-lg font-semibold">
        <Icons.wallet className={"h-6 w-6"} />
        Connect Wallet
      </Button>
    ),
  },
);

interface ISwapCard {
  inputCurrency?: Address | undefined;
  outputCurrency?: Address | undefined;
  isMainPage?: boolean;
  showBear?: boolean;
  className?: string;
}
export function SwapCard({
  inputCurrency,
  outputCurrency,
  showBear = true,
  className,
}: ISwapCard) {
  const {
    setSwapKind,
    setSelectedFrom,
    selectedFrom,
    allowance,
    selectedTo,
    fromAmount,
    setFromAmount,
    toAmount,
    error,
    setToAmount,
    setSelectedTo,
    setSwapAmount,
    onSwitch,
    swapInfo,
    payload,
    showPriceImpact,
    priceImpact,
    exchangeRate,
    gasPrice,
    tokenInPrice,
    tokenOutPrice,
  } = useSwap({
    inputCurrency,
    outputCurrency,
  });
  const { isConnected } = useBeraJs();
  const [exceedingBalance, setExceedingBalance] = useState(false);

  const [openPreview, setOpenPreview] = useState(false);

  const { write, isLoading, ModalPortal } = useTxn({
    message: `Swap ${Number(swapInfo?.formattedSwapAmount).toFixed(4)} ${
      selectedFrom?.symbol
    } to ${Number(swapInfo?.formattedReturnAmount).toFixed(4)} ${
      selectedTo?.symbol
    }`,
    onSuccess: () => {
      setOpenPreview(false);
    },
    onError: () => {
      setOpenPreview(false);
    },
  });

  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      {ModalPortal}
      <div className="w-full">
        {showBear && (
          <Image
            src={`${cloudinaryUrl}/bears/qsmspkwyjoeh1cwb6fz7`}
            className="mx-auto self-start md:mx-0"
            alt="bidness"
            width={150}
            height={200}
          />
        )}
        <div className="flex w-full flex-col gap-4 md:flex-row">
          <Card className="w-full rounded-2xl px-6 py-8">
            <CardTitle className="center flex items-center justify-between px-2">
              Swap <SettingsPopover />
            </CardTitle>
            <div className="mt-3">
              <div className="border-1 flex flex-col gap-6 border-border">
                <ul
                  role="list"
                  className="divide-y divide-border rounded-2xl border"
                >
                  <TokenInput
                    selected={selectedFrom}
                    selectedTokens={[selectedFrom, selectedTo]}
                    onTokenSelection={setSelectedFrom}
                    amount={fromAmount ?? 0}
                    onExceeding={(isExceeding: boolean) =>
                      setExceedingBalance(isExceeding)
                    }
                    setAmount={(amount) => {
                      setSwapKind(SwapKind.GIVEN_IN);
                      setSwapAmount(amount);
                      setFromAmount(amount);
                    }}
                  />
                  <div className="relative">
                    <div
                      className="absolute inset-0 flex w-full items-center justify-center"
                      aria-hidden="true"
                    >
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={() => {
                          onSwitch();
                        }}
                        className="z-10 inline-flex h-6 w-6 items-center rounded-full bg-background p-0.5 text-sm font-semibold text-muted-foreground md:h-8 md:w-8 md:p-1"
                      >
                        <Icons.swap className="h-3 w-3 md:h-6 md:w-6" />
                      </Button>
                    </div>
                  </div>
                  <TokenInput
                    selected={selectedTo}
                    hideBalance
                    selectedTokens={[selectedFrom, selectedTo]}
                    onTokenSelection={setSelectedTo}
                    amount={toAmount}
                    setAmount={(amount) => {
                      setSwapKind(SwapKind.GIVEN_OUT);
                      setSwapAmount(amount);
                      setToAmount(amount);
                    }}
                    showExceeding={false}
                  />
                </ul>
                <div className="flex flex-col gap-2">
                  {swapInfo && (
                    <div className="flex w-full flex-col gap-1 rounded-lg bg-muted p-3">
                      <div className="flex w-full flex-row justify-between">
                        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                          Exchange rate
                        </p>
                        <p className="whitespace-nowrap text-right text-xs font-medium sm:text-sm">
                          {exchangeRate ?? "-"}
                        </p>
                      </div>
                      <div className="flex w-full flex-row justify-between">
                        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                          Gas fee
                        </p>
                        <p className="whitespace-nowrap text-right text-xs font-medium sm:text-sm">
                          {gasPrice} BERA
                        </p>
                      </div>
                    </div>
                  )}
                  {exceedingBalance && (
                    <Alert
                      variant="destructive"
                      className="items-center justify-center"
                    >
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        This amount exceeds your total balance
                      </AlertDescription>
                    </Alert>
                  )}
                  {error instanceof RouteNotFound && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription className="text-xs">
                        {error.message}
                      </AlertDescription>
                    </Alert>
                  )}
                  {showPriceImpact && (
                    <Alert variant="destructive">
                      <AlertTitle>
                        {" "}
                        <Icons.tooltip className="mt-[-4px] inline h-4 w-4" />{" "}
                        Price Impact Error
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        This swap will result in a high price impact (-
                        {priceImpact?.toFixed(2)}%)
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="w-full">
                  {(Number(allowance?.formattedAllowance) ?? 0) < fromAmount &&
                  !exceedingBalance ? (
                    <DynamicApproveButton
                      token={selectedFrom}
                      spender={erc20ModuleAddress}
                    />
                  ) : isConnected ? (
                    swapInfo !== undefined ? (
                      <DynamicPreview
                        swapInfo={swapInfo}
                        disabled={
                          !swapInfo?.formattedReturnAmount || exceedingBalance
                        }
                        priceImpact={priceImpact}
                        exchangeRate={exchangeRate}
                        tokenIn={selectedFrom}
                        tokenOut={selectedTo}
                        tokenInPrice={tokenInPrice}
                        tokenOutPrice={tokenOutPrice}
                        open={openPreview}
                        setOpen={setOpenPreview}
                        write={() => {
                          write({
                            address: erc20DexAddress,
                            abi: DEX_PRECOMPILE_ABI,
                            functionName: "batchSwap",
                            params: payload,
                          });
                        }}
                        isLoading={isLoading}
                      />
                    ) : (
                      <Button
                        disabled={true}
                        variant={"outline"}
                        className="mt-4 w-full"
                      >
                        Select Token & Enter Amount
                      </Button>
                    )
                  ) : (
                    <Connect />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}