"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionActionType, useBeraJs, type Token } from "@bera/berajs";
import { balancerPoolCreationHelper, balancerVaultAddress } from "@bera/config";
import {
  ActionButton,
  ApproveButton,
  useAnalytics,
  useTxn,
} from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Button } from "@bera/ui/button";
import { Card } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { InputWithLabel } from "@bera/ui/input";
import { PoolType } from "@berachain-foundation/berancer-sdk";
import { formatUnits, parseUnits } from "viem";

import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import { useCreatePool } from "~/hooks/useCreatePool";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import { TokenInput } from "~/hooks/useMultipleTokenInput";
import { usePoolCreationRelayerApproval } from "~/hooks/usePoolCreationRelayerApproval";

export default function CreatePageContent() {
  const router = useRouter();
  const { captureException, track } = useAnalytics(); // FIXME: analytics

  const [tokens, setTokens] = useState<TokenInput[]>([]);
  const [weights, setWeights] = useState<number[]>([]);
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableLiquidityInput, setEnableLiquidityInput] =
    useState<boolean>(false);

  // handle max/min tokens per https://docs.balancer.fi/concepts/pools/more/configuration.html
  const minTokensLength = poolType === PoolType.Weighted ? 3 : 2; // i.e. for stable/composable stable it's 2
  const maxTokensLength = poolType === PoolType.Weighted ? 8 : 4; // i.e. for stable/composable stable it's 4 w/ BPT as a token

  // check for token approvals FIXME: we should not be including slippage in this calculation, its messing up the approval amount check
  const { needsApproval: tokensNeedApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovalsWithSlippage(tokens, balancerVaultAddress);

  // Check relayer approval and prompt for approval if needed
  const {
    ModalPortal: ModalPortalRelayerApproval,
    swr: { data: isRelayerApproved, isLoading: isLoadingRelayerStatus },
    writeApproval: approveRelayer,
    isLoading: isRelayerApprovalLoading,
    isError: isRelayerApprovalError,
  } = usePoolCreationRelayerApproval({
    relayerAddress: balancerVaultAddress,
    poolCreationHelper: balancerPoolCreationHelper,
  });
  useEffect(() => {
    if (isRelayerApprovalError) {
      setErrorMessage(
        `Error approving pool creation helper on vault: ${isRelayerApprovalError}`,
      );
    }
  }, [isRelayerApprovalError]);

  // add or remove token information when we select a token
  const handleTokenSelection = (token: Token | undefined, index: number) => {
    setTokens((prevTokens) => {
      const updatedTokens = [...prevTokens];
      if (!token) {
        updatedTokens.splice(index, 1);
      } else {
        updatedTokens[index] = {
          amount: "0",
          exceeding: false,
          ...token,
        } as TokenInput;
      }

      return updatedTokens.slice(0, minTokensLength);
    });
    setWeights((prevWeights) => {
      const updatedWeights = [...prevWeights];
      if (!token) {
        updatedWeights.slice(0, index);
      } else {
        updatedWeights[index] = 1 / minTokensLength;
      }
      return updatedWeights.slice(0, minTokensLength);
    });
  };

  // if the pool type changes we need to reset the tokens
  useEffect(() => {
    setTokens([]);
    setWeights([]);
  }, [poolType]);

  const {
    poolName,
    poolSymbol,
    isDupePool,
    dupePool,
    createPool,
    isLoadingPools,
    errorLoadingPools,
    ModalPortal,
    formattedNormalizedWeights,
  } = useCreatePool({
    tokens,
    weights: weights,
    poolType,
    onSuccess: () => {
      track("create_pool_success");
      router.push("/pools");
    },
    onError: (e) => {
      track("create_pool_failed");
      captureException(new Error("Create pool failed"), {
        data: { rawError: e },
      });
    },
  });

  // Determine if liquidity input should be enabled (i.e. we have selected enough tokens)
  useEffect(() => {
    if (
      tokens &&
      tokens.length >= minTokensLength &&
      tokens.every((token) => token) &&
      !isLoadingPools &&
      !errorLoadingPools &&
      !isDupePool
    ) {
      setEnableLiquidityInput(true);
    } else {
      setEnableLiquidityInput(false);
    }
  }, [tokens, poolType, isLoadingPools, isDupePool, errorLoadingPools]);

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center justify-center gap-8">
      {ModalPortal}
      {ModalPortalRelayerApproval}
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
        <section className="flex w-full flex-col gap-4">
          <h1 className="self-start text-3xl font-semibold">
            Select a Pool Type
          </h1>
          <div className="flex w-full flex-row gap-6">
            <Card
              onClick={() => setPoolType(PoolType.ComposableStable)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border-2 p-4",
                poolType === PoolType.ComposableStable && "border-sky-600",
              )}
            >
              <span className="text-lg font-semibold">Stable</span>
              {/* NOTE: we are actually creating ComposableStable pools under the hood, which are functionally the same. */}
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Recommended for stable pairs
              </span>
              <span className="mt-[24px] text-sm text-muted-foreground">
                Fee: <span className="font-medium text-foreground">0.01%</span>
              </span>
            </Card>
            <Card
              onClick={() => setPoolType(PoolType.Weighted)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border-2 p-4",
                poolType === PoolType.Weighted && "border-sky-600",
              )}
            >
              <span className="text-lg font-semibold">Weighted</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Customize the weights of tokens
              </span>
              <span className="mt-[24px] text-sm text-muted-foreground">
                Fee: <span className="font-medium text-foreground">0.01%</span>
              </span>
            </Card>
            <Card
              onClick={() => setPoolType(PoolType.MetaStable)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border-2 p-4",
                poolType === PoolType.MetaStable && "border-sky-600",
              )}
            >
              <span className="text-lg font-semibold">MetaStable</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                The most efficient pool type for two highly correlated tokens
              </span>
              <span className="mt-[24px] text-sm text-muted-foreground">
                Fee: <span className="font-medium text-foreground">0.01%</span>
              </span>
            </Card>
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <h1 className="self-start text-3xl font-semibold">Select Tokens</h1>
          <div className="flex w-full flex-col gap-6">
            {/* FIXME: this is wrong, it's min satisfying but we need a +/- button */}
            <CreatePoolInput
              token={tokens[0]}
              selectedTokens={tokens}
              onTokenSelection={(token) => handleTokenSelection(token, 0)}
            />
            {poolType === PoolType.Weighted && (
              <>
                <CreatePoolInput
                  token={tokens[1]}
                  selectedTokens={tokens}
                  onTokenSelection={(token) => handleTokenSelection(token, 1)}
                />
                {poolType === PoolType.Weighted && (
                  <CreatePoolInput
                    token={tokens[2]}
                    selectedTokens={tokens}
                    onTokenSelection={(token) => handleTokenSelection(token, 2)}
                  />
                )}
              </>
            )}
            {(poolType === PoolType.ComposableStable ||
              poolType === PoolType.MetaStable) && (
              <CreatePoolInput
                token={tokens[1]}
                selectedTokens={tokens}
                onTokenSelection={(token) => handleTokenSelection(token, 1)}
              />
            )}
          </div>
        </section>

        {isDupePool && (
          <Alert variant="destructive">
            <AlertTitle>Similar Pool Already Exists</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                Please note that creating this pool will not be possible;
                consider adding liquidity to an existing pool instead.
              </p>
              <a
                href={`/pools/${dupePool?.id}/`}
                className="text-sky-600 underline"
              >
                Similar pool
              </a>
            </AlertDescription>
          </Alert>
        )}

        <section
          className={cn(
            "flex w-full flex-col gap-10",
            !enableLiquidityInput && "pointer-events-none opacity-25",
          )}
        >
          <h1 className="self-start text-3xl font-semibold">
            Set Initial Liquidity
          </h1>
          <div className="flex flex-col gap-4">
            <ul className="divide-y divide-border rounded-lg border">
              {tokens.map((token, index) => (
                <li
                  key={index}
                  className="flex items-center gap-4 space-x-4 border-b p-4 last:border-b-0"
                >
                  {/* Token Input with Border */}
                  <div className="flex-1">
                    <CreatePoolInitialLiquidityInput
                      disabled={!enableLiquidityInput}
                      token={token as Token}
                      tokenAmount={token.amount}
                      onTokenBalanceChange={(amount) => {
                        setTokens((prevTokens) => {
                          const updatedTokens = [...prevTokens];
                          updatedTokens[index] = {
                            ...updatedTokens[index],
                            amount,
                          };
                          return updatedTokens;
                        });
                      }}
                    />
                  </div>

                  {/* Weight Input */}
                  {poolType === PoolType.Weighted && (
                    <>
                      <div className="w-1/6">
                        <InputWithLabel
                          className="w-full"
                          outerClassName=""
                          label="Weight"
                          type="number"
                          value={weights[index]}
                          onChange={(e) => {
                            const newWeights = [...weights];
                            newWeights[index] = Math.min(
                              Number(e.target.value),
                              100,
                            );
                            setWeights(newWeights);
                          }}
                        />
                      </div>

                      <div className="w-1/6 text-right text-sm text-gray-400">
                        <p>{`Normalized:\n${formattedNormalizedWeights[index]}`}</p>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/*  FIXME: Set Swap Fee section */}
          <section className="flex w-full flex-col gap-10">
            <h1 className="self-start text-3xl font-semibold">Set Swap Fee</h1>
            <div className="flex flex-col gap-4">
              <Card className="flex w-full cursor-pointer flex-col gap-0 border-2 p-4">
                <span className="text-lg font-semibold">Swap Fee</span>
                <span className="mt-[-4px] text-sm text-muted-foreground">
                  Fee charged on each swap
                </span>
                <span className="mt-[24px] text-sm text-muted-foreground">
                  Fee:{" "}
                  <span className="font-medium text-foreground">0.01%</span>
                </span>
              </Card>
            </div>
          </section>

          {/* FIXME: pool name and pool symbol input */}
          <section className="flex w-full flex-col gap-10 pb-16">
            <p className="self-start text-3xl font-semibold">Pool Name</p>
            <div className="flex flex-col gap-4">
              <Card className="flex w-full cursor-pointer flex-col gap-0 border-2 p-4">
                <span className="text-lg font-semibold">Pool Name</span>
                <span className="mt-[-4px] text-sm text-muted-foreground">
                  {poolName}
                </span>
              </Card>
              <Card className="flex w-full cursor-pointer flex-col gap-0 border-2 p-4">
                <span className="text-lg font-semibold">Pool Symbol</span>
                <span className="mt-[-4px] text-sm text-muted-foreground">
                  {poolSymbol}
                </span>
              </Card>
            </div>
          </section>

          {/* Approvals */}
          {!isRelayerApproved && (
            <Button
              disabled={isRelayerApprovalLoading}
              onClick={approveRelayer}
              className="mt-4 w-full"
            >
              {isRelayerApprovalLoading || isLoadingRelayerStatus
                ? "Approving..."
                : "Approve Pool Creation Helper"}
            </Button>
          )}

          {tokensNeedApproval.length > 0 &&
            (() => {
              const approvalTokenIndex = tokens.findIndex(
                (t) => t.address === tokensNeedApproval[0]?.address,
              );
              const approvalToken = tokens[approvalTokenIndex];
              const approvalAmount = parseUnits(
                approvalToken.amount,
                approvalToken?.decimals ?? 18,
              );

              return (
                <ApproveButton
                  amount={approvalAmount}
                  token={approvalToken}
                  spender={balancerVaultAddress}
                  onApproval={() => refreshAllowances()}
                />
              );
            })()}

          {/* Pool creation button itself */}
          <ActionButton>
            <Button
              disabled={tokensNeedApproval.length > 0 || !isRelayerApproved}
              className="w-full"
              onClick={createPool}
            >
              Create Pool
            </Button>
          </ActionButton>
        </section>
      </div>
    </div>
  );
}
