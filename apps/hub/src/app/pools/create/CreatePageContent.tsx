"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type Token } from "@bera/berajs";
import { balancerPoolCreationHelper, balancerVaultAddress } from "@bera/config";
import {
  ActionButton,
  ApproveButton,
  SwapFeeInput,
  useAnalytics,
} from "@bera/shared-ui";
import { cn } from "@bera/ui";
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Button } from "@bera/ui/button";
import { Card } from "@bera/ui/card";
import { Icons } from "@bera/ui/icons";
import { InputWithLabel } from "@bera/ui/input";
import { PoolType } from "@berachain-foundation/berancer-sdk";
import { parseUnits } from "viem";

import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import { useCreatePool } from "~/hooks/useCreatePool";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import { TokenInput } from "~/hooks/useMultipleTokenInput";
import { usePoolCreationRelayerApproval } from "~/hooks/usePoolCreationRelayerApproval";

const emptyToken: TokenInput = {
  address: "" as `0x${string}`,
  amount: "0",
  decimals: 18,
  exceeding: false,
  name: "",
  symbol: "",
};

export default function CreatePageContent() {
  const router = useRouter();
  const { captureException, track } = useAnalytics();

  const [tokens, setTokens] = useState<TokenInput[]>([emptyToken, emptyToken]);
  const [weights, setWeights] = useState<number[]>([]);
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableLiquidityInput, setEnableLiquidityInput] =
    useState<boolean>(false);
  const [swapFee, setSwapFee] = useState<number>(0.01);

  // handle max/min tokens per https://docs.balancer.fi/concepts/pools/more/configuration.html
  const minTokensLength = poolType === PoolType.Weighted ? 3 : 2; // i.e. for meta/stable it's 2
  const maxTokensLength = poolType === PoolType.Weighted ? 8 : 5; // i.e. for meta/stable it's 5

  // check for token approvals
  const { needsApproval: tokensNeedApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovalsWithSlippage(tokens, balancerVaultAddress);

  // Check relayer approval and prompt for approval if needed
  const {
    ModalPortal: ModalPortalRelayerApproval,
    swr: { data: isRelayerApproved, isLoading: isLoadingRelayerStatus },
    writeApproval: approveRelayer,
    isLoading: isRelayerApprovalLoading,
    isError: isRelayerApprovalError,
  } = usePoolCreationRelayerApproval();
  useEffect(() => {
    if (isRelayerApprovalError) {
      setErrorMessage(
        `Error approving pool creation helper on vault: ${isRelayerApprovalError}`,
      );
    }
  }, [isRelayerApprovalError]);

  // update the correct token within the tokens array when we select/re-select a token
  const handleTokenSelection = (token: Token | undefined, index: number) => {
    setTokens((prevTokens) => {
      const updatedTokens = [...prevTokens];
      if (token) {
        updatedTokens[index] = {
          amount: "0",
          exceeding: false,
          ...token,
        } as TokenInput;
      }
      return updatedTokens;
    });
    setWeights((prevWeights) => {
      const updatedWeights = [...prevWeights];
      if (token) {
        updatedWeights[index] = 1 / minTokensLength;
      }
      return updatedWeights;
    });
  };

  const addTokenInput = () => {
    if (tokens.length < maxTokensLength) {
      setTokens([...tokens, emptyToken]);
      setWeights([...weights, 1 / maxTokensLength]);
    }
  };

  const removeTokenInput = (index: number) => {
    if (tokens.length > minTokensLength) {
      setTokens((prevTokens) => prevTokens.filter((_, i) => i !== index));
      setWeights((prevWeights) => prevWeights.filter((_, i) => i !== index));
    }
  };

  // if the pool type changes we need to reset the tokens
  useEffect(() => {
    const initialTokens = Array(minTokensLength).fill(emptyToken);
    const initialWeights = Array(minTokensLength).fill(1 / minTokensLength);
    setTokens(initialTokens);
    setWeights(initialWeights);
  }, [poolType]);

  const {
    poolName: generatedPoolName,
    poolSymbol: generatedPoolSymbol,
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
    swapFee,
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

  const [poolName, setPoolName] = useState<string>(generatedPoolName);
  const [poolSymbol, setPoolSymbol] = useState<string>(generatedPoolSymbol);
  useEffect(() => {
    setPoolName(generatedPoolName);
    setPoolSymbol(generatedPoolSymbol);
  }, [generatedPoolName, generatedPoolSymbol]);

  // Determine if liquidity input should be enabled (i.e. we have selected enough tokens)
  useEffect(() => {
    if (
      tokens &&
      tokens.length >= minTokensLength &&
      tokens.every((token) => token.address) &&
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
                "flex w-full cursor-pointer flex-col gap-0 border p-4",
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
                "flex w-full cursor-pointer flex-col gap-0 border p-4",
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
                "flex w-full cursor-pointer flex-col gap-0 border p-4",
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
            {tokens.map((token, index) => (
              <div key={index} className="flex items-center gap-2">
                <CreatePoolInput
                  token={token}
                  selectedTokens={tokens}
                  onTokenSelection={(selectedToken: Token | undefined) =>
                    handleTokenSelection(selectedToken, index)
                  }
                />
                {tokens.length > minTokensLength && (
                  <Button
                    onClick={() => removeTokenInput(index)}
                    variant="ghost"
                  >
                    x
                  </Button>
                )}
              </div>
            ))}
            {tokens.length < maxTokensLength && (
              <div className="mr-auto">
                <Button onClick={addTokenInput} variant="ghost">
                  + Add Token
                </Button>
              </div>
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
                <div
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
                </div>
              ))}
            </ul>
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <section className="flex w-full flex-col gap-10">
            <h1 className="self-start text-3xl font-semibold">Set Swap Fee</h1>
            <div className="flex flex-col gap-4">
              <Card className="flex w-full cursor-pointer flex-col gap-0 border p-4">
                <SwapFeeInput
                  initialFee={swapFee}
                  onFeeChange={(fee) => {
                    setSwapFee(fee);
                  }}
                />
              </Card>
            </div>
          </section>

          <section className="flex w-full flex-col gap-10 py-12">
            <div className="flex flex-col gap-4">
              <Card className="flex w-full cursor-pointer flex-col gap-0 border p-4">
                <InputWithLabel
                  label="Pool Name"
                  value={poolName}
                  maxLength={85}
                  onChange={(e) => {
                    setPoolName(e.target.value);
                  }}
                />
              </Card>
              <Card className="flex w-full cursor-pointer flex-col gap-0 border p-4">
                <InputWithLabel
                  label="Pool Symbol"
                  value={poolSymbol}
                  maxLength={85}
                  onChange={(e) => {
                    setPoolSymbol(e.target.value.replace(" ", "-"));
                  }}
                />
              </Card>
            </div>
          </section>

          <section className="flex w-full flex-col gap-10">
            <h1 className="self-start text-3xl font-semibold">
              Approve & Submit
            </h1>

            {/* Approvals TODO: this and below belong inside a preview page*/}
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
                // NOTE: we might avoid doing this if we can return TokenInput amount in the ApprovalToken[]
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
        </section>
      </div>
    </div>
  );
}
