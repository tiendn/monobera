"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  TXN_GAS_USED_ESTIMATES,
  TransactionActionType,
  useBeraJs,
  useGasData,
  usePollWalletBalances,
  type Token,
} from "@bera/berajs";
import { balancerVaultAddress, cloudinaryUrl } from "@bera/config";
import {
  ActionButton,
  ApproveButton,
  InfoBoxList,
  InfoBoxListItem,
  PreviewToken,
  TokenIcon,
  TokenInput,
  TokenList,
  TxnPreview,
  useSlippage,
  useTxn,
} from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Button } from "@bera/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { Address, formatEther, parseUnits } from "viem";

import { SettingsPopover } from "~/components/settings-popover";
import { Skeleton } from "@bera/ui/skeleton";
import { AddLiquiditySuccess } from "@bera/shared-ui";
import Link from "next/link";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import {
  AddLiquidityKind,
  vaultV2Abi,
} from "@berachain-foundation/berancer-sdk";
import { usePool } from "~/b-sdk/usePool";
import { AddLiquidityDetails } from "./AddLiquidiyDetails";
import { getPoolUrl } from "../../fetchPools";
import { beraToken, wBeraToken } from "@bera/wagmi";
import { useAddLiquidity } from "./useAddLiquidity";
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Checkbox } from "@bera/ui/checkbox";

interface IAddLiquidityContent {
  poolId: Address;
}

export default function AddLiquidityContent({ poolId }: IAddLiquidityContent) {
  const { data, isLoading } = usePool({ id: poolId });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pool, v3Pool] = data ?? [];

  const [wethIsEth, setWethIsEth] = useState(false);
  const { account } = useBeraJs();

  const slippage = useSlippage();

  useEffect(() => {
    console.log("POOL", pool, v3Pool);
  }, [pool, v3Pool]);

  const {
    queryOutput,
    priceImpact,
    input,
    type,
    setInput,
    getCallData,
    setType,
    error,
    isLoading: isLoadingAddLiquidity,
  } = useAddLiquidity({
    pool: v3Pool,
    wethIsEth,
  });

  const isProportional = type === AddLiquidityKind.Proportional;

  const activeQueryOutput = queryOutput;

  const { needsApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovalsWithSlippage(
      activeQueryOutput?.amountsIn?.map((amount) => ({
        symbol: "token",
        name: "token",
        ...amount.token,
        exceeding: false,
        decimals: amount.token.decimals,
        amount: formatEther(amount.scale18),
      })) ?? [],
      balancerVaultAddress,
      slippage,
    );

  const needsApprovalNoBera = wethIsEth
    ? needsApproval.filter(
        (n) => n.address.toLowerCase() !== wBeraToken.address.toLowerCase(),
      )
    : needsApproval;

  useEffect(() => {
    if (!pool && !isLoading) {
      notFound();
    }
  }, [pool, isLoading]);

  useEffect(() => {
    console.log({ priceImpact, queryOutput });
  }, [priceImpact]);

  const balancedInput = input.at(0);

  const reset = () => {
    setPreviewOpen(false);
    setInput([]);
  };
  const { refresh } = usePollWalletBalances();
  const { write, ModalPortal } = useTxn({
    message: `Add liquidity to ${pool?.name}`,
    onSuccess: () => {
      reset();
      refresh();
    },
    CustomSuccessModal: pool?.address ? AddLiquiditySuccess : undefined,
    customSuccessModalProps: pool?.address
      ? {
          pool: pool,
        }
      : undefined,
    actionType: TransactionActionType.ADD_LIQUIDITY,
  });

  const totalValue = queryOutput?.amountsIn.reduce((acc, curr) => {
    return (
      acc +
      Number(formatEther(curr.scale18)) *
        Number(
          pool?.tokens?.find((t) => t.address === curr.token.address)?.token
            ?.latestUSDPrice ?? 0,
        )
    );
  }, 0);

  return (
    <div className="mt-16 flex w-full flex-col items-center justify-center gap-4">
      {ModalPortal}
      <Card className="mx-6 w-full items-center bg-background p-4 sm:mx-0 sm:w-[480px] flex flex-col">
        {isLoading ? (
          <Skeleton className="h-8 w-40 self-center" />
        ) : (
          <p className="text-center text-2xl font-semibold">{pool?.name}</p>
        )}
        <div className="flex w-full flex-row items-center justify-center rounded-lg p-4">
          {isLoading ? (
            <Skeleton className="h-12 w-24" />
          ) : (
            pool?.tokens
              ?.filter((t) => t.address !== pool.address)
              .map((token, i) => {
                return (
                  <TokenIcon
                    symbol={token.symbol}
                    address={token.address}
                    className={cn("h-12 w-12", i !== 0 && "ml-[-16px]")}
                    key={token.address}
                  />
                );
              })
          )}
        </div>
        <Link
          href={getPoolUrl(pool)}
          className="flex items-center justify-center text-sm font-normal leading-tight text-muted-foreground hover:cursor-pointer hover:underline"
        >
          View Pool Details
          <Icons.arrowRight className="W-4 h-4" />
        </Link>
      </Card>
      <Card className="mx-6 w-full sm:w-[480px] md:mx-0 ">
        <CardHeader>
          <CardTitle className="center flex justify-between font-bold">
            Add Liquidity
            <SettingsPopover showDeadline={false} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TokenList>
            {pool?.tokens
              ?.filter((t) => t.address !== pool.address)
              .map((token, idx) => {
                const currInput = input.find(
                  (i) => i.address === token.address,
                );

                return (
                  <TokenInput
                    key={token?.address ?? idx}
                    selected={
                      token.address.toLowerCase() ===
                      wBeraToken.address.toLowerCase()
                        ? wethIsEth
                          ? { ...token, ...beraToken }
                          : token
                        : token
                    }
                    selectable={
                      token.address.toLowerCase() ===
                      wBeraToken.address.toLowerCase()
                    }
                    customTokenList={
                      token.address.toLowerCase() ===
                      wBeraToken.address.toLowerCase()
                        ? [wBeraToken, beraToken]
                        : [token]
                    }
                    amount={
                      !isProportional
                        ? currInput?.amount
                        : balancedInput?.address === token.address
                          ? balancedInput.amount
                          : formatEther(
                              queryOutput?.amountsIn.find(
                                (t) => t.token.address === token.address,
                              )?.scale18 ?? 0n,
                            )
                    }
                    onTokenSelection={(tk) => {
                      if (
                        token?.address.toLowerCase() ===
                        wBeraToken.address.toLowerCase()
                      ) {
                        setWethIsEth(tk?.address === beraToken.address);
                      }
                    }}
                    setAmount={(amount: string) => {
                      if (isProportional) {
                        setInput([
                          {
                            address: token.address as Address,
                            amount,
                          },
                        ]);
                        return;
                      }

                      setInput((prev) => {
                        const prevIdx = prev.findIndex(
                          (i) => i.address === token.address,
                        );
                        const input = {
                          address: token.address as Address,
                          amount,
                        };
                        if (prevIdx === -1) {
                          return [...prev, input];
                        }
                        return [
                          ...prev.slice(0, prevIdx),
                          input,
                          ...prev.slice(prevIdx + 1),
                        ];
                      });
                      // setIsBaseInput(true);
                      // handleBaseAssetAmountChange(amount);
                    }}
                    price={Number(token?.token?.latestUSDPrice ?? "0")}
                    onExceeding={
                      (exceeding: boolean) => false // updateTokenExceeding(0, exceeding)
                    }
                    showExceeding={true}
                    // disabled={!poolPrice}
                    // beraSafetyMargin={estimatedBeraFee}
                  />
                );
              })}
          </TokenList>
          {process.env.NODE_ENV === "development" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="balance-amounts"
                checked={type === AddLiquidityKind.Proportional}
                onClick={() =>
                  setType((t) =>
                    t === AddLiquidityKind.Proportional
                      ? AddLiquidityKind.Unbalanced
                      : AddLiquidityKind.Proportional,
                  )
                }
              />
              <label htmlFor="balance-amounts">Balance amounts</label>
            </div>
          )}
          <AddLiquidityDetails
            totalValue={totalValue?.toString()}
            priceImpact={priceImpact}
            exchangeRate="0"
          />
          {error && (
            <Alert variant="destructive">
              <AlertTitle>
                <Icons.tooltip className="mt-[-4px] inline h-4 w-4" /> Error
              </AlertTitle>
              <AlertDescription className="text-xs">
                {error.balanceError
                  ? `Balancer error ${error.balanceError}`
                  : error.message}
              </AlertDescription>
            </Alert>
          )}
          {/* {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )} */}
          <TxnPreview
            open={previewOpen}
            disabled={error !== undefined || isLoadingAddLiquidity}
            title={"Confirm LP Addition Details"}
            imgURI={`${cloudinaryUrl}/placeholder/preview-swap-img_ucrnla`}
            triggerText={"Preview"}
            setOpen={setPreviewOpen}
          >
            <TokenList className="bg-muted">
              {activeQueryOutput?.amountsIn
                .filter((a) => a.token.address !== pool?.address)
                .map((amount) => (
                  <PreviewToken
                    token={
                      wethIsEth &&
                      amount.token.address.toLowerCase() ===
                        wBeraToken.address.toLowerCase()
                        ? beraToken
                        : pool?.tokens?.find(
                            (t) => t.address === amount.token.address,
                          )
                    }
                    value={formatEther(amount.scale18)}
                    // price={Number(baseToken?.usdValue ?? 0)}
                  />
                ))}
            </TokenList>
            {needsApprovalNoBera.length > 0 ? (
              <ApproveButton
                amount={needsApprovalNoBera.at(0)!.maxAmountIn}
                token={
                  v3Pool!.tokens.find(
                    (t) => t.address === needsApprovalNoBera.at(0)!.address,
                  ) as Token
                }
                spender={balancerVaultAddress}
                onApproval={() => refreshAllowances()}
              />
            ) : (
              <ActionButton>
                <Button
                  className="w-full"
                  disabled={activeQueryOutput?.amountsIn.every(
                    (i) => i.amount === 0n,
                  )}
                  onClick={() => {
                    const data = getCallData({
                      slippage: slippage ?? 0,
                      sender: account!,
                    });

                    write({
                      params: data.args,
                      address: data.to,
                      abi: vaultV2Abi,
                      functionName: "joinPool",
                      value: data.value,
                    });
                  }}
                >
                  Add Liquidity
                </Button>
              </ActionButton>
            )}
          </TxnPreview>
        </CardContent>
      </Card>
    </div>
  );
}
