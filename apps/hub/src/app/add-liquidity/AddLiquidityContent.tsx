"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  TXN_GAS_USED_ESTIMATES,
  TransactionActionType,
  bexAbi,
  useBeraJs,
  useGasData,
  usePollWalletBalances,
  usePool,
  type Token,
} from "@bera/berajs";
import {
  balancerVaultAddress,
  beraTokenAddress,
  cloudinaryUrl,
  crocDexAddress,
} from "@bera/config";
import {
  ActionButton,
  ApproveButton,
  FormattedNumber,
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
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Button } from "@bera/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { Address, formatEther, parseUnits } from "viem";

import { isBera, isBeratoken } from "~/utils/isBeraToken";
import { SettingsPopover } from "~/components/settings-popover";
import { getBaseCost, getPoolUrl, getQuoteCost } from "../pools/fetchPools";
import { useAddLiquidityUnbalanced } from "@bera/berajs";
import { useSelectedPool } from "~/hooks/useSelectedPool";
import { Skeleton } from "@bera/ui/skeleton";
import { AddLiquiditySuccess } from "@bera/shared-ui/src/txn-modals";
import Link from "next/link";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import { vaultV2Abi } from "@balancer/sdk";

interface IAddLiquidityContent {
  shareAddress: Address;
}

export default function AddLiquidityContent({
  shareAddress,
}: IAddLiquidityContent) {
  const { data, isLoading } = usePool({ id: shareAddress });

  const [previewOpen, setPreviewOpen] = useState(false);
  const { v2Pool: pool, v3Pool } = data ?? {};

  const { account } = useBeraJs();

  useEffect(() => {
    console.log("POOL", pool, v3Pool);
  }, [pool, v3Pool]);

  const { queryOutput, input, setInput, getCallData } =
    useAddLiquidityUnbalanced({
      pool: v3Pool,
    });

  const {
    needsApproval,
    needsApprovalNoBera,
    refresh: refreshAllowances,
  } = useMultipleTokenApprovalsWithSlippage(
    queryOutput?.amountsIn?.map((amount) => ({
      symbol: "token",
      name: "token",
      ...amount.token,
      exceeding: false,
      decimals: amount.token.decimals,
      amount: formatEther(amount.scale18),
    })) ?? [],
    balancerVaultAddress,
  );

  useEffect(() => {
    if (!pool && !isLoading) {
      notFound();
    }
  }, [pool, isLoading]);

  // const {
  //   baseToken,
  //   quoteToken,
  //   poolPrice,
  //   error,
  //   previewOpen,
  //   tokenInputs,
  //   needsApproval,
  //   areAllInputsEmpty,
  //   isBaseInput,
  //   setIsBaseInput,
  //   refreshAllowances,
  //   reset,
  //   updateTokenAmount,
  //   updateTokenExceeding,
  //   setPreviewOpen,
  //   beraToken,
  //   wBeraToken,
  //   isNativeBera,
  //   setIsNativeBera,
  // } = useAddLiquidity(pool);

  const { refresh } = usePollWalletBalances();
  const { write, ModalPortal } = useTxn({
    message: `Add liquidity to ${pool?.name}`,
    onSuccess: () => {
      // reset();
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

  const slippage = useSlippage();

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
            pool?.tokens?.map((token, i) => {
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
            {/* <SettingsPopover /> */}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TokenList>
            {pool?.tokens?.map((token, idx) => {
              const currInput = input.find((i) => i.address === token.address);

              return (
                <TokenInput
                  key={token?.address}
                  selected={token}
                  selectable={false}
                  customTokenList={[token]}
                  amount={currInput?.amount}
                  setAmount={(amount: string) => {
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
          <InfoBoxList>
            {/* <InfoBoxListItem
              title={"Pool Price"}
              value={
                poolPrice ? (
                  <span>
                    <FormattedNumber
                      value={poolPrice}
                      symbol={baseToken?.symbol ?? ""}
                    />{" "}
                    = 1 {quoteToken?.symbol}
                  </span>
                ) : (
                  <span>{"-"}</span>
                )
              }
            />
            <InfoBoxListItem
              title={"Total Value"}
              value={
                <FormattedNumber
                  value={totalHoneyPrice}
                  symbol="USD"
                  compact={false}
                />
              }
            /> */}

            <InfoBoxListItem title={"Slippage"} value={`${slippage}%`} />
          </InfoBoxList>
          {/* {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )} */}
          <TxnPreview
            open={previewOpen}
            // disabled={}
            title={"Confirm LP Addition Details"}
            imgURI={`${cloudinaryUrl}/placeholder/preview-swap-img_ucrnla`}
            triggerText={"Preview"}
            setOpen={setPreviewOpen}
          >
            <TokenList className="bg-muted">
              {queryOutput?.amountsIn.map((amount) => (
                <PreviewToken
                  token={{
                    ...amount.token,
                    address: amount.token.wrapped as Address,
                  }}
                  value={formatEther(amount.scale18)}
                  // price={Number(baseToken?.usdValue ?? 0)}
                />
              ))}
            </TokenList>
            {/* <InfoBoxList>
              <InfoBoxListItem
                title={"Pool Price"}
                value={
                  poolPrice ? (
                    <span>
                      <FormattedNumber
                        value={poolPrice}
                        symbol={baseToken?.symbol ?? ""}
                      />{" "}
                      = 1 {quoteToken?.symbol}
                    </span>
                  ) : (
                    <span>{"-"}</span>
                  )
                }
              />
              <InfoBoxListItem
                title={"Total Value"}
                value={
                  <FormattedNumber
                    value={totalHoneyPrice}
                    symbol="USD"
                    compact={false}
                  />
                }
              />
              <InfoBoxListItem title={"Slippage"} value={`${slippage}%`} />
            </InfoBoxList> */}
            {needsApproval.length > 0 ? (
              <>
                {needsApprovalNoBera.map((token, idx) => (
                  <ApproveButton
                    amount={queryOutput?.amountsIn.at(idx)?.amount}
                    token={token}
                    spender={balancerVaultAddress}
                    onApproval={() => refreshAllowances()}
                  />
                ))}
              </>
            ) : (
              <ActionButton>
                <Button
                  className="w-full"
                  onClick={() => {
                    const data = getCallData(1, account!);

                    // @ts-ignore
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
