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
import { keccak256, parseUnits } from "viem";
import { usePublicClient } from "wagmi";

import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import { usePools } from "~/b-sdk/usePools";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import { TokenInput } from "~/hooks/useMultipleTokenInput";
import { usePoolCreationRelayerApproval } from "~/hooks/usePoolCreationRelayerApproval";

export default function CreatePageContent() {
  const router = useRouter();
  const { captureException, track } = useAnalytics(); // FIXME: analytics

  const [tokens, setTokens] = useState<Token[]>([]); // NOTE: functionally max is 3 tokens FIXME: use TokenInput!!!
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [tokenAmounts, setTokenAmounts] = useState<string[]>([]);
  const [isDupePool, setIsDupePool] = useState<boolean>(false);
  const [dupePool, setDupePool] = useState<PoolWithMethods | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableLiquidityInput, setEnableLiquidityInput] =
    useState<boolean>(false);

  const { account } = useBeraJs();
  const publicClient = usePublicClient();

  // check for token approvals FIXME: we should not be including slippage in this calculation, its messing up the approval amount check
  const { needsApproval: tokensNeedApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovalsWithSlippage(
      tokens.map(
        (token, index) =>
          ({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            amount: tokenAmounts[index] ?? "0",
            decimals: token.decimals,
            exceeding: false,
          } as TokenInput),
      ),
      balancerVaultAddress,
    );

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

  const handleTokenSelection = (token: Token | null, index: number) => {
    setTokens((prevTokens) => {
      const updatedTokens = [...prevTokens];
      if (token === null) {
        updatedTokens.splice(index, 1);
      } else {
        updatedTokens[index] = token;
      }
      return updatedTokens.slice(0, 3);
    });
  };

  const handleTokenAmountChange = (amount: string, index: number) => {
    setTokenAmounts((prev) => {
      const newAmounts = [...prev];
      newAmounts[index] = amount;
      return newAmounts;
    });
  };

  // pull down the pools we have to check for duplicates
  const {
    data: pools,
    isLoading: isLoadingPools,
    error: errorLoadingPools,
  } = usePools();
  useEffect(() => {
    if (!isLoadingPools) {
      console.log("POOLS LOADED:", pools);
    }
  }, [pools]);

  const generatePoolName = (tokens: Token[], poolType: PoolType) => {
    const tokenSymbols = tokens.map((token) => token.symbol).join(" | ");
    return `${tokenSymbols} ${poolType}`;
  };

  // symbol has no spaces
  const generatePoolSymbol = (tokens: Token[], poolType: PoolType) => {
    const tokenSymbols = tokens.map((token) => token.symbol).join("-");
    return `${tokenSymbols}-${poolType.toUpperCase()}`;
  };

  const [poolName, poolSymbol] = useMemo(() => {
    return [
      generatePoolName(tokens, poolType),
      generatePoolSymbol(tokens, poolType),
    ];
  }, [tokens, poolType]);

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

  // Check for duplicate pools
  useEffect(() => {
    if (tokens.length === 0) return;
    if (isLoadingPools) return;

    const isDupe = pools?.find((pool) => {
      const hasAllTokens = tokens.every((token) =>
        pool?.tokenAddresses?.includes(token.address.toLowerCase()),
      );
      if (hasAllTokens && pool?.poolType.toString() === poolType.toString()) {
        setDupePool(pool);
        return true;
      }
      setDupePool(null);
      return false;
    });

    setIsDupePool(!!isDupe);
  }, [tokens, pools, isLoadingPools]);

  // update the form state if the user changes the pool type (i.e. let them input liquidity again)
  useEffect(() => {
    // FIXME this max/min doesnt follow the rules
    const requiredTokensLength = poolType === PoolType.Weighted ? 3 : 2;

    setTokens((prevTokens) => {
      if (prevTokens.length > requiredTokensLength) {
        return prevTokens.slice(0, requiredTokensLength);
      }
      return prevTokens;
    });

    setTokenAmounts((prevAmounts) => {
      if (prevAmounts.length !== requiredTokensLength) {
        const updatedAmounts = prevAmounts.slice(0, requiredTokensLength);
        while (updatedAmounts.length < requiredTokensLength) {
          updatedAmounts.push("");
        }
        return updatedAmounts;
      }
      return prevAmounts;
    });

    // Determine if liquidity input should be enabled
    if (
      tokens &&
      tokens.length === requiredTokensLength &&
      tokens.every((token) => token) &&
      !isLoadingPools &&
      !isDupePool &&
      !errorLoadingPools
    ) {
      setEnableLiquidityInput(true);
    } else {
      setEnableLiquidityInput(false);
    }
  }, [
    tokens,
    tokenAmounts,
    poolType,
    isLoadingPools,
    isDupePool,
    errorLoadingPools,
  ]);

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
            <CreatePoolInput
              token={tokens[0]}
              selectedTokens={tokens}
              onTokenSelection={(token) =>
                handleTokenSelection(token ?? null, 0)
              }
            />
            {poolType === PoolType.Weighted && (
              <>
                <CreatePoolInput
                  token={tokens[1]}
                  selectedTokens={tokens}
                  onTokenSelection={(token) =>
                    handleTokenSelection(token ?? null, 1)
                  }
                />
                <CreatePoolInput
                  token={tokens[2]}
                  selectedTokens={tokens}
                  onTokenSelection={(token) =>
                    handleTokenSelection(token ?? null, 2)
                  }
                />
              </>
            )}
            {(poolType === PoolType.ComposableStable ||
              poolType === PoolType.MetaStable) && (
              <CreatePoolInput
                token={tokens[1]}
                selectedTokens={tokens}
                onTokenSelection={(token) =>
                  handleTokenSelection(token ?? null, 1)
                }
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
                  tokenAmount={tokenAmounts[index] || ""}
                  onTokenBalanceChange={(amount) =>
                    handleTokenAmountChange(amount, index)
                  }
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
              const approvalToken = tokens[approvalTokenIndex] as Token;
              const approvalAmount = parseUnits(
                tokenAmounts[approvalTokenIndex] || "0",
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
              onClick={() => {
                if (!publicClient) {
                  return;
                }
                // FIXME this belongs in a use hook, we're creating a pool using the PoolCreationHelper contract
                const name = poolName;
                const symbol = poolSymbol;
                const tokensAddresses = tokens.map((token) => token.address);
                const normalizedWeights = [
                  // FIXME we need weight inputs
                  BigInt(parseFixed("0.333333333333333333", 18).toString()),
                  BigInt(parseFixed("0.333333333333333333", 18).toString()),
                  BigInt(parseFixed("0.333333333333333334", 18).toString()),
                ];
                const rateProviders = tokens.map(() => ADDRESS_ZERO);
                const swapFeePercentage = BigInt(
                  parseFixed("0.01", 16).toString(),
                );
                const tokenRateCacheDurations = tokens.map(() => BigInt(100));
                const exemptFromYieldProtocolFeeFlag = tokens.map(() => false);
                const amplificationParameter = BigInt(62);
                const amountsIn = tokens.map((token, index) =>
                  parseUnits(tokenAmounts[index] || "0", token.decimals ?? 18),
                );
                const owner = account;
                const isStablePool =
                  poolType === PoolType.ComposableStable ||
                  poolType === PoolType.MetaStable;

                // Sort tokens and related arrays by address
                const sortedData = tokensAddresses
                  .map((token, index) => ({
                    token,
                    amountIn: amountsIn[index],
                    rateProvider: rateProviders[index],
                    weight: normalizedWeights[index],
                    cacheDuration: tokenRateCacheDurations[index],
                    feeFlag: exemptFromYieldProtocolFeeFlag[index],
                  }))
                  .sort((a, b) => {
                    // FIXME: this is dumb
                    const tokenAA = BigInt(a.token);
                    const tokenBB = BigInt(b.token);
                    if (tokenAA < tokenBB) return -1;
                    if (tokenAA > tokenBB) return 1;
                    return 0;
                  });

                // Extract sorted arrays from sortedData
                const sortedTokens = sortedData.map((item) => item.token);
                const sortedAmountsIn = sortedData.map((item) => item.amountIn);
                const sortedRateProviders = sortedData.map(
                  (item) => item.rateProvider,
                );
                const sortedWeights = sortedData.map((item) => item.weight);
                const sortedCacheDurations = sortedData.map(
                  (item) => item.cacheDuration,
                );
                const sortedFeeFlags = sortedData.map((item) => item.feeFlag);

                let args = [];
                const salt = keccak256(Buffer.from(`${name}-${owner}`));
                if (isStablePool) {
                  // FIXME: for some reason stable pools are not going through rn.
                  args = [
                    name,
                    symbol,
                    sortedTokens,
                    amplificationParameter,
                    sortedRateProviders,
                    sortedCacheDurations,
                    sortedFeeFlags,
                    swapFeePercentage,
                    sortedAmountsIn,
                    owner,
                    salt,
                  ];
                } else {
                  args = [
                    name,
                    symbol,
                    sortedTokens,
                    sortedWeights,
                    sortedRateProviders,
                    swapFeePercentage,
                    sortedAmountsIn,
                    owner,
                    salt,
                  ];
                }

                const writeData = {
                  abi: balancerPoolCreationHelperAbi,
                  address: balancerPoolCreationHelper,
                  functionName: isStablePool
                    ? "createAndJoinStablePool"
                    : "createAndJoinWeightedPool",
                  params: args,
                  account: account,
                  value: 0n,
                  gasLimit: 7920027n, // NOTE: this costs a fair bit, so the default limit is way too low.
                }; //as IContractWrite<TAbi, TFunctionName>;

                console.log("writeData", writeData);
                write(writeData);
              }}
            >
              Create Pool
            </Button>
          </ActionButton>
        </section>
      </div>
    </div>
  );
}
