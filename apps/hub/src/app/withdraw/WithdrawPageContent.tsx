/* eslint no-use-before-define: 0 */ // --> OFF

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  TokenBalance,
  TransactionActionType,
  bexAbi,
  type Token,
} from "@bera/berajs";
import { cloudinaryUrl } from "@bera/config";
import {
  ActionButton,
  FormattedNumber,
  InfoBoxList,
  InfoBoxListItem,
  PreviewToken,
  TokenIcon,
  TokenList,
  TxnPreview,
  useSlippage,
  useTxn,
} from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Button } from "@bera/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { Slider } from "@bera/ui/slider";
import { usePublicClient } from "wagmi";

import { SettingsPopover } from "~/components/settings-popover";
import { getPoolUrl } from "../pools/fetchPools";
import { Skeleton } from "@bera/ui/skeleton";
import {
  PoolState,
  PoolStateWithBalances,
} from "@berachain-foundation/berancer-sdk";
import { pools } from "~/utils/constants";
import { usePool } from "~/b-sdk/usePool";
import { usePoolUserPosition } from "~/b-sdk/usePoolUserPosition";

interface ITokenSummary {
  title: string;
  pool: PoolStateWithBalances | undefined;
  tokenBalances?: TokenBalance[];
  isLoading: boolean;
}

const TokenSummary = ({
  title,
  pool,
  tokenBalances,
  isLoading,
}: ITokenSummary) => {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted p-3">
      <p className="w-full text-left text-lg font-semibold">{title}</p>
      {pool?.tokens.map((token, idx) => {
        return (
          <div
            key={token.address}
            className="flex w-full flex-row items-center justify-between"
          >
            <p className="text-sm text-muted-foreground">
              Pooled {isLoading ? "..." : token?.symbol}
            </p>
            <div className="flex flex-row items-center gap-1 font-medium">
              {isLoading
                ? "..."
                : tokenBalances?.[idx]?.formattedBalance ?? "0"}{" "}
              <TokenIcon address={token?.address} symbol={token?.symbol} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function WithdrawLiquidityContent({
  poolId,
}: {
  poolId: string;
}) {
  const { data, isLoading } = usePool({ id: poolId });
  const { v2Pool, v3Pool } = data ?? {};

  const reset = () => {
    setPreviewOpen(false);
    setPercentage(0);
  };

  useEffect(() => {
    v2Pool &&
      v3Pool &&
      console.log({
        v2Pool,
        v3Pool,
      });
  }, [v2Pool, v3Pool]);

  const router = useRouter();

  const [previewOpen, setPreviewOpen] = useState(false);

  const [percentage, setPercentage] = useState<number>(0);

  const slippage = useSlippage();

  const baseToken = v2Pool?.tokens[0];
  const quoteToken = v2Pool?.tokens[1];

  const {
    data: userPositionBreakdown,
    isLoading: isPositionBreakdownLoading,
    refresh,
  } = usePoolUserPosition({ pool: v3Pool });

  const { write, ModalPortal } = useTxn({
    message: `Withdraw liquidity from ${v2Pool?.name}`,
    onSuccess: () => {
      reset();
      refresh();
    },
    actionType: TransactionActionType.WITHDRAW_LIQUIDITY,
  });

  const client = usePublicClient();
  const handleWithdrawLiquidity = useCallback(async () => {
    // try {
    //   // const withdrawLiquidityRequest = await getWithdrawLiquidityPayload({
    //   //   args: {
    //   //     slippage: slippage ?? 0,
    //   //     poolPrice,
    //   //     baseToken,
    //   //     quoteToken,
    //   //     poolIdx: pool?.poolIdx,
    //   //     percentRemoval: amount,
    //   //     seeds: userPositionBreakdown?.seeds.toString() ?? "0",
    //   //     poolId: pool?.poolId,
    //   //   },
    //   //   publicClient: client,
    //   // });
    //   // write({
    //   //   address: crocDexAddress,
    //   //   abi: bexAbi,
    //   //   functionName: "userCmd",
    //   //   params: withdrawLiquidityRequest?.payload ?? [],
    //   // });
    // } catch (error) {
    //   console.error("Error creating pool:", error);
    // }
  }, [write, client, userPositionBreakdown, slippage, baseToken, quoteToken]);

  const notDeposited =
    userPositionBreakdown === undefined ||
    userPositionBreakdown?.lpBalance?.balance === 0n;

  return (
    <div className="mt-16 flex w-full flex-col items-center justify-center gap-4">
      {ModalPortal}
      <Card className="mx-6 w-full items-center bg-background p-4 sm:mx-0 sm:w-[480px] flex flex-col">
        {isLoading ? (
          <Skeleton className="h-8 w-40 self-center" />
        ) : (
          <p className="text-center text-2xl font-semibold">{v2Pool?.name}</p>
        )}
        <div className="flex w-full flex-row items-center justify-center rounded-lg p-4">
          {isLoading ? (
            <Skeleton className="h-12 w-24" />
          ) : (
            v2Pool?.tokens?.map((token, i) => {
              return (
                <TokenIcon
                  address={token.address}
                  symbol={token.symbol}
                  className={cn("h-12 w-12", i !== 0 && "ml-[-16px]")}
                  key={token.address}
                />
              );
            })
          )}
        </div>
        <div
          onClick={() => router.push(getPoolUrl(v2Pool))}
          className="flex items-center justify-center text-sm font-normal leading-tight text-muted-foreground hover:cursor-pointer hover:underline"
        >
          View Pool Details
          <Icons.arrowRight className="W-4 h-4" />
        </div>
      </Card>
      <Card className="mx-6 w-full sm:w-[480px] md:mx-0 ">
        <CardHeader>
          <CardTitle className="center flex justify-between font-bold">
            Withdraw Liquidity
            <SettingsPopover />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TokenSummary
            pool={v3Pool}
            tokenBalances={userPositionBreakdown?.tokenBalances}
            title="Your Tokens In the Pool"
            isLoading={isPositionBreakdownLoading}
          />
          <div className="w-full rounded-lg border p-4">
            <div className="flex w-full flex-row items-center justify-between gap-1">
              <p className="text-sm font-semibold sm:text-lg">
                {percentage.toFixed(2)}%
              </p>
              <div className="flex flex-row gap-2">
                {[25, 50, 75, 100].map((percent) => {
                  return (
                    <Button
                      key={percent.toString()}
                      variant={"secondary"}
                      disabled={notDeposited}
                      size={"sm"}
                      className="w-full text-foreground"
                      onClick={() => setPercentage(percent)}
                    >
                      {percent.toString()}%
                    </Button>
                  );
                })}
              </div>
            </div>
            <Slider
              defaultValue={[0]}
              value={[percentage]}
              disabled={notDeposited}
              max={100}
              min={0}
              onValueChange={(value: number[]) => {
                setPercentage(value[0] ?? 0);
              }}
            />
          </div>
          <InfoBoxList>
            {v3Pool?.tokens.map((token) => (
              <InfoBoxListItem
                key={token.index}
                title={`Removing ${isLoading ? "..." : token?.symbol ?? ""}`}
                value={
                  <div className="flex flex-row items-center justify-end gap-1">
                    <FormattedNumber
                      value={
                        (Number(
                          userPositionBreakdown?.tokenBalances?.at(token.index)
                            ?.formattedBalance,
                        ) *
                          percentage) /
                          100 ?? "0"
                      }
                      compact={false}
                    />
                    <TokenIcon
                      address={token?.address}
                      size={"md"}
                      symbol={token?.symbol}
                    />
                  </div>
                }
              />
            ))}
            {/* <InfoBoxListItem
              title={"Pool Price"}
              value={
                0 ? (
                  <>
                    <FormattedNumber value={0} symbol={baseToken?.symbol} /> = 1{" "}
                    {quoteToken?.symbol}
                  </>
                ) : (
                  "-"
                )
              }
            /> */}
            {/* <InfoBoxListItem
              title={"Estimated Value"}
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
          <TxnPreview
            open={previewOpen}
            title={"Confirm LP Withdrawal Details"}
            imgURI={`${cloudinaryUrl}/placeholder/preview-swap-img_ucrnla`}
            triggerText={"Preview"}
            setOpen={setPreviewOpen}
            disabled={
              percentage === 0 ||
              isPositionBreakdownLoading ||
              userPositionBreakdown === undefined
            }
          >
            <TokenList className="divide-muted bg-muted">
              {v3Pool?.tokens.map((token) => (
                <PreviewToken
                  key={token.address}
                  // @ts-ignore
                  token={token}
                  value={Number(token)}
                  // price={Number(token?.usdValue ?? 0)}
                />
              ))}
            </TokenList>
            <InfoBoxList>
              <InfoBoxListItem
                title={"Pool Price"}
                value={
                  percentage ? (
                    <>
                      <FormattedNumber
                        value={percentage}
                        symbol={baseToken?.symbol}
                      />{" "}
                      = 1 {quoteToken?.symbol}
                    </>
                  ) : (
                    "-"
                  )
                }
              />
              {/* <InfoBoxListItem
                title={"Estimated Value"}
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
            <ActionButton>
              <Button
                className="w-full"
                onClick={() => handleWithdrawLiquidity()}
              >
                Withdraw Liquidity
              </Button>
            </ActionButton>
          </TxnPreview>
        </CardContent>
      </Card>
    </div>
  );
}
