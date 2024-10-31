"use client";

import { getSafeNumber, POOLID, TransactionActionType } from "@bera/berajs";
import {
  ActionButton,
  ApproveButton,
  SSRSpinner,
  useAnalytics,
  useSlippage,
  useTxn,
} from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Button } from "@bera/ui/button";
import { Card } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { Input } from "@bera/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@bera/ui/tabs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const INITIAL_AMOUNT = 11000n;

export default function CreatePageContent() {
  const router = useRouter();

  const { captureException, track } = useAnalytics();

  const { write, ModalPortal } = useTxn({
    message: "Create new pool",
    onSuccess: () => {
      track("create_pool_success");
      router.push("/pools");
    },
    onError: (e: Error | undefined) => {
      track("create_pool_failed");
      captureException(new Error("create pool failed"), {
        data: { rawError: e },
      });
    },
    actionType: TransactionActionType.CREATE_POOL,
  });

  const slippage = useSlippage();

  const handleCreatePool = useCallback(async () => {
    return;
  }, [slippage, write]);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-8 max-w-[600px]">
      {ModalPortal}
      <Button
        variant={"ghost"}
        size="sm"
        className="flex items-center gap-1 self-start"
        onClick={() => router.push("/pools")}
      >
        <Icons.arrowLeft className="h-4 w-4" />
        <div className="text-sm font-medium">All Pools</div>
      </Button>
      <div className="flex w-full flex-col items-center justify-center gap-16">
        <section className="w-full flex flex-col gap-4">
          <h1 className="text-3xl font-semibold self-start">Creating a pool</h1>
          <div className="w-full flex flex-row gap-6">
            {/* <CreatePoolInput
              key={0}
              token={tokenA}
              selectedTokens={[tokenA, tokenB] as Token[]}
              onTokenSelection={setTokenA}
            />
            <CreatePoolInput
              key={1}
              token={tokenB}
              selectedTokens={[tokenA, tokenB] as Token[]}
              onTokenSelection={setTokenB}
            /> */}
          </div>
        </section>

        <section className="w-full flex flex-col gap-4">
          <h1 className="text-3xl font-semibold self-start">
            Select a pair type
          </h1>

          <div className="w-full flex flex-row gap-6">
            <Card
              // onClick={() => setPoolId(POOLID.AMBIENT)}
              className={cn(
                "p-4 flex flex-col gap-0 w-full border-2",
                // poolId === POOLID.AMBIENT && "border-sky-600",
              )}
            >
              <span className="text-lg font-semibold">Ambient</span>
              <span className="text-sm text-muted-foreground mt-[-4px]">
                Recommended for volatile pairs
              </span>
              <span className="text-sm text-muted-foreground mt-[24px]">
                Fee: <span className="text-foreground font-medium">0.3%</span>
              </span>
            </Card>
            <Card
              // onClick={() => setPoolId(POOLID.STABLE)}
              className={cn(
                "p-4 flex flex-col gap-0 w-full border-2 opacity-50 cursor-not-allowed",
                // poolId === POOLID.STABLE && "border-sky-600",
              )}
            >
              <span className="text-lg font-semibold">
                Stable (coming soon)
              </span>
              <span className="text-sm text-muted-foreground mt-[-4px]">
                Recommended for stable pairs
              </span>
              <span className="text-sm text-muted-foreground mt-[24px]">
                Fee: <span className="text-foreground font-medium">0.01%</span>
              </span>
            </Card>
          </div>
        </section>

        {/* {isDupePool && (
          <Alert variant="destructive">
            <AlertTitle>Similar Pools Already Exist</AlertTitle>
            <AlertDescription>
              Please note that creating this pool will not be possible; consider
              adding liquidity to an existing pool instead.
            </AlertDescription>
          </Alert>
        )} */}

        {/* {isDupePoolLoading && tokenA && tokenB && (
          <div className="flex flex-row items-center text-2xl font-medium gap-2 justify-start w-full">
            <SSRSpinner size={10} /> Checking for duplicate pools.
          </div>
        )} */}

        {POOLID.AMBIENT && (
          <section
            className={cn(
              "w-full flex flex-col gap-4",
              // setPriceSectionDisabled && "opacity-25 pointer-events-none",
            )}
          >
            <h1 className="text-3xl font-semibold self-start ">Set Price</h1>
            {/* {!setPriceSectionDisabled && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Denominate in
                </span>
                <Tabs defaultValue="base">
                  <TabsList
                    className="grid w-fit grid-cols-2 bg-none"
                    variant="ghost"
                  >
                    <TabsTrigger
                      value="base"
                      onClick={() => setIsPriceBase(true)}
                    >
                      {baseToken?.symbol}
                    </TabsTrigger>
                    <TabsTrigger
                      value="quote"
                      onClick={() => setIsPriceBase(false)}
                    >
                      {quoteToken?.symbol}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )} */}
            <div className="rounded-sm border-border border p-2">
              {/* <Input
                value={initialPrice}
                onChange={(e) => setInitialPrice(e.target.value)}
                type="number-enhanced"
                className="border-none bg-transparent text-3xl font-semibold p-0"
              />
              {!setPriceSectionDisabled && (
                <span className="text-sm text-muted-foreground font-medium">
                  {isPriceBase
                    ? `${baseToken?.symbol} per ${quoteToken?.symbol}`
                    : `${quoteToken?.symbol} per ${baseToken?.symbol}`}
                </span>
              )} */}
            </div>
          </section>
        )}
        <section
          className={cn(
            "w-full flex flex-col gap-4",
            // setInitialLiquiditySectionDisabled &&
            //   "opacity-25 pointer-events-none",
          )}
        >
          <h1 className="text-3xl font-semibold self-start">
            Initial Liquidity
          </h1>
          <div className="flex flex-col gap-4">
            <ul className="divide divide-y divide-border rounded-lg border">
              {/* <CreatePoolInitialLiquidityInput
                disabled={false}
                key={0}
                token={baseToken as Token}
                tokenAmount={baseAmount}
                onTokenBalanceChange={handleBaseAssetAmountChange}
              />
              <CreatePoolInitialLiquidityInput
                disabled={false}
                key={1}
                token={quoteToken as Token}
                tokenAmount={quoteAmount}
                onTokenBalanceChange={handleQuoteAssetAmountChange}
              /> */}
            </ul>
          </div>
          {
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Error message</AlertDescription>
            </Alert>
          }

          {
            // should be nees Approval
            INITIAL_AMOUNT ? (
              <ActionButton>
                {/* <ApproveButton
                amount={parseUnits(
                  baseToken?.address === needsApproval[0]?.address
                    ? baseAmount
                    : quoteAmount,
                  needsApproval[0]?.decimals ?? 18,
                )}
                token={needsApproval[0]}
                onApproval={() => refreshAllowances()}
              /> */}
              </ActionButton>
            ) : (
              <ActionButton>
                <Button
                  disabled={false}
                  className="w-full"
                  onClick={() => handleCreatePool()}
                >
                  Create Pool
                </Button>
              </ActionButton>
            )
          }
        </section>
      </div>
    </div>
  );
}
