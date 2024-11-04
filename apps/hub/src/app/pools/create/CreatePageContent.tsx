"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PoolWithMethods, parseFixed } from "@balancer-labs/sdk";
import {
  ADDRESS_ZERO,
  TransactionActionType,
  balancerPoolCreationHelperAbi,
  useBeraJs,
  type Token,
} from "@bera/berajs";
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
import { PoolType } from "@berachain-foundation/berancer-sdk";
import { Address, keccak256, parseUnits } from "viem";
import { usePublicClient } from "wagmi";

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
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableLiquidityInput, setEnableLiquidityInput] =
    useState<boolean>(false);

  const { account } = useBeraJs();
  const publicClient = usePublicClient();

  // check for token approvals FIXME: we should not be including slippage in this calculation, its messing up the approval amount check
  const { needsApproval: tokensNeedApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovalsWithSlippage(tokens, balancerVaultAddress);

  // Check relayer approval
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

  const minTokensLength = poolType === PoolType.Weighted ? 3 : 2;
  const handleTokenSelection = (token: Token | undefined, index: number) => {
    setTokens((prevTokens) => {
      const updatedTokens = [...prevTokens];

      if (!token) {
        // remove a token
        updatedTokens.splice(index, 1);
      } else {
        // add a new token
        updatedTokens[index] = {
          amount: "0",
          exceeding: false,
          ...token,
        } as TokenInput;
      }

      return updatedTokens.slice(0, minTokensLength);
    });
  };

  // on success we'll redirect to the pool page
  const { write, ModalPortal } = useTxn({
    message: "Creating new pool...",
    onSuccess: async (hash: string) => {
      track("create_pool_success");
      router.push("/pools");
    },
    onError: (e) => {
      track("create_pool_failed");
      captureException(new Error("Create pool failed"), {
        data: { rawError: e },
      });
      setErrorMessage(`Error creating pool: ${e?.message}`);
    },
    actionType: TransactionActionType.CREATE_POOL,
  });

  const {
    poolName,
    poolSymbol,
    isDupePool,
    dupePool,
    createPool,
    isLoadingPools,
    errorLoadingPools,
  } = useCreatePool({
    tokens,
    weights: [0.33333333333, 0.33333333333, 0.33333333333], // FIXME need to expose this as an input
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

  // Determine if liquidity input should be enabled
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
              {/* NOTE: we are actually creating ComposableStable pools under the hood. */}
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
            <ul className="divide divide-y divide-border rounded-lg border">
              {tokens.map((token, index) => (
                <CreatePoolInitialLiquidityInput
                  disabled={!enableLiquidityInput}
                  key={index}
                  token={token as Token}
                  tokenAmount={token.amount}
                  onTokenBalanceChange={(amount) => {
                    // NOTE: doing the update in this way triggers a re-render
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
