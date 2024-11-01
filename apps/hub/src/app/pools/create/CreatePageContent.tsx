"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PoolType, PoolWithMethods, parseFixed } from "@balancer-labs/sdk";
import {
  TransactionActionType,
  balancerPoolCreationHelperAbi,
  useBeraJs,
  type GetAllowances,
  type Token,
} from "@bera/berajs";
import {
  getAllowance,
  getAllowances,
  getWalletBalances,
} from "@bera/berajs/actions";
import { balancerPoolCreationHelper } from "@bera/config";
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
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { usePublicClient } from "wagmi";

import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import { balancerClient } from "~/b-sdk/balancerClient";
import { usePools } from "~/b-sdk/usePools";

export default function CreatePageContent() {
  const router = useRouter();
  const { captureException, track } = useAnalytics();

  const [tokens, setTokens] = useState<Token[]>([]); // NOTE: functionally max is 3 tokens
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [baseAmount, setBaseAmount] = useState<string>("");
  const [quoteAmounts, setQuoteAmounts] = useState<string[]>([]);
  const [needsApproval, setNeedsApproval] = useState<Token[]>([]);
  const [insufficientBalance, setInsufficientBalance] = useState<Token[]>([]);
  const [isDupePool, setIsDupePool] = useState<boolean>(false);
  const [dupePool, setDupePool] = useState<PoolWithMethods | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableLiquidityInput, setEnableLiquidityInput] =
    useState<boolean>(false);

  const slippage = useSlippage(); // FIXME
  const { account, config: beraConfig, signer } = useBeraJs();
  const publicClient = usePublicClient();

  const [baseToken, quoteTokens] = useMemo(() => {
    // FIXME
    return [tokens[0], tokens.slice(1)];
  }, [tokens]);

  // check balance and allowance for each token that we are trying to add liquidity with
  useEffect(() => {
    const checkBalancesAndAllowances = async () => {
      const requiredAmounts = tokens.map((token, index) =>
        parseUnits(
          token === baseToken
            ? baseAmount ?? "0"
            : quoteAmounts[index - 1] ?? "0",
          token.decimals ?? 18,
        ),
      );

      // Fetch allowances and balances
      const [allowances, balances] = await Promise.all([
        getAllowances({
          tokens,
          account,
          config: beraConfig,
          spender: balancerPoolCreationHelper,
          publicClient,
        }),
        getWalletBalances({
          account,
          tokenList: tokens,
          config: beraConfig,
          publicClient,
        }),
      ]);

      // Identify tokens needing approval and with insufficient balance
      const tokensRequiringApproval: Token[] = [];
      const tokensWithInsufficientBalance: Token[] = [];

      tokens.forEach((token, index) => {
        if (
          allowances &&
          BigInt(allowances[index]?.allowance ?? "0") < requiredAmounts[index]
        ) {
          tokensRequiringApproval.push(token);
        }

        if (
          balances &&
          BigInt(balances[index]?.balance ?? "0") < requiredAmounts[index]
        ) {
          tokensWithInsufficientBalance.push(token);
        }
      });

      setNeedsApproval(tokensRequiringApproval);
      setInsufficientBalance(tokensWithInsufficientBalance);
    };

    if (account && tokens.length > 0) {
      checkBalancesAndAllowances();
    }
  }, [account, tokens, baseAmount, quoteAmounts, baseToken]);

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

  const handleBaseAssetAmountChange = (amount: string) => {
    setBaseAmount(amount);
  };

  const handleQuoteAssetAmountChange = (amount: string, index: number) => {
    setQuoteAmounts((prev) => {
      const newAmounts = [...prev];
      newAmounts[index] = amount;
      return newAmounts;
    });
  };

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

  const { write, ModalPortal } = useTxn({
    message: "Creating new pool...",
    onSuccess: async (hash) => {
      try {
        // FIXME probably not good to chain these like this?
        // Manually retrieve the transaction receipt using the hash.... FIXME what is the useTxn way???
        const receipt = await balancerClient.provider.waitForTransaction(hash);

        // If the transaction was successful, proceed to join the pool
        if (receipt.status === 1) {
          track("create_pool_success");
          router.push("/pools");
          initiateJoinTransaction(receipt);
        } else {
          throw new Error("Transaction failed");
        }
      } catch (e) {
        setErrorMessage(`Error retrieving transaction receipt: ${e}`);
        console.error("Error retrieving transaction receipt:", e);
      }
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
  // Using the custom hook for pool creation FIXME move this into a use hook!
  const amplificationParameter = "72"; // FIXME what is the range on this supposed to be
  const tokenRateCacheDurations = tokens.map(() => "100");
  const exemptFromYieldProtocolFeeFlags = tokens.map(() => false); // No exemptions for stable pools
  const swapFeePercentage = "1"; // FIXME need the swap fee FE for this (slider)

  async function createPool() {
    try {
      const poolFactory = balancerClient.pools.poolFactory.of(
        PoolType.ComposableStable,
      );

      const createInfo = poolFactory.create({
        name: poolName,
        symbol: poolSymbol,
        tokenAddresses: tokens.map((token) => token.address),
        rateProviders: tokens.map(() => zeroAddress),
        swapFeeEvm: parseFixed(swapFeePercentage, 16).toString(),
        tokenRateCacheDurations,
        exemptFromYieldProtocolFeeFlags,
        amplificationParameter,
        owner: account,
      });

      console.log("createInfo", createInfo);

      write({
        address: balancerPoolCreationHelper,
        data: createInfo.data,
      });
    } catch (err) {
      setErrorMessage(`Error creating pool: ${err}`);
      console.error("Error creating pool:", err);
    }
  }

  // @ts-ignore
  function initiateJoinTransaction(reciept: any) {
    // FIXME: this is a pos TransactionReciept class from inside balancer sdk @ethersproject/abstract-provider
    try {
      const signer = balancerClient.provider.getSigner();
      const poolFactory = balancerClient.pools.poolFactory.of(
        PoolType.ComposableStable,
      );

      // Get pool address and pool ID
      poolFactory
        .getPoolAddressAndIdWithReceipt(signer.provider, reciept)
        .then(({ poolAddress, poolId }) => {
          const joinInfo = poolFactory.buildInitJoin({
            joiner: account,
            poolId,
            poolAddress,
            tokensIn: tokens,
            amountsIn: tokens.map((token) =>
              formatUnits(token, token.decimals ?? 18),
            ),
          });

          console.log("joinInfo", joinInfo);

          write({
            address: joinInfo.to,
            data: joinInfo.data,
            value: joinInfo.value,
          });
        })
        .catch((err) => {
          setErrorMessage(`Error joining pool: ${err?.message}`);
          console.error("Error joining pool:", err);
        });
    } catch (err) {
      setErrorMessage(`Error joining pool: ${err}`);
      console.error("Error joining pool:", err);
    }
  }

  // check for duplicates
  useEffect(() => {
    if (!baseToken || !quoteTokens.length) return;
    if (isLoadingPools) return;

    const isDupe = pools?.find((pool) => {
      const hasAllTokens = [baseToken, ...quoteTokens].every((token) =>
        pool?.tokenAddresses?.includes(token?.address.toLowerCase()),
      );
      if (hasAllTokens && pool?.poolType === poolType) {
        setDupePool(pool);
        return true;
      }
      setDupePool(null);
      return false;
    });

    setIsDupePool(!!isDupe);
  }, [baseToken, quoteTokens, pools, isLoadingPools]);

  // FIXME: we need to raise if the amount exceeds balance as an error message

  // update the form state if the user changes the pool type (i.e. let them input liquidity again)
  useEffect(() => {
    const requiredQuoteTokensLength = poolType === PoolType.Weighted ? 3 : 2;

    setTokens((prevTokens) => {
      if (prevTokens.length > requiredQuoteTokensLength) {
        return prevTokens.slice(0, requiredQuoteTokensLength);
      }
      return prevTokens;
    });

    setQuoteAmounts((prevAmounts) => {
      const requiredQuoteAmountsLength = requiredQuoteTokensLength - 1;
      if (
        prevAmounts.length !== requiredQuoteAmountsLength ||
        prevAmounts.some(
          (amount, index) =>
            index >= requiredQuoteAmountsLength && amount !== "",
        )
      ) {
        const updatedAmounts = [
          ...prevAmounts.slice(0, requiredQuoteAmountsLength),
        ];
        while (updatedAmounts.length < requiredQuoteAmountsLength) {
          updatedAmounts.push("");
        }
        return updatedAmounts;
      }
      return prevAmounts;
    });

    setNeedsApproval((prev) => {
      const requiredApprovals = tokens.filter((token) => !prev.includes(token));
      return [...prev, ...requiredApprovals];
    });

    // Determine if liquidity input should be enabled
    if (
      baseToken &&
      tokens.length === requiredQuoteTokensLength &&
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
    baseToken,
    tokens,
    quoteAmounts,
    poolType,
    isLoadingPools,
    isDupePool,
    errorLoadingPools,
  ]);

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center justify-center gap-8">
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
              <CreatePoolInitialLiquidityInput
                disabled={!enableLiquidityInput}
                key={0}
                token={baseToken as Token}
                tokenAmount={baseAmount}
                onTokenBalanceChange={handleBaseAssetAmountChange}
              />
              {quoteTokens.map((token, index) => (
                <CreatePoolInitialLiquidityInput
                  disabled={!enableLiquidityInput}
                  key={index + 1}
                  token={token as Token}
                  tokenAmount={quoteAmounts[index] || ""}
                  onTokenBalanceChange={(amount) =>
                    handleQuoteAssetAmountChange(amount, index)
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
          <section className="flex w-full flex-col gap-10">
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

          {/* // Handle approvals for each token before creating the pool FIXME: this UX sucks */}
          {needsApproval.map((token, index) => (
            <ApproveButton
              key={token.address}
              amount={parseUnits(
                // FIXME: THIS IS VERY HACKY
                token.address === baseToken?.address
                  ? baseAmount
                  : quoteAmounts[index] || "0",
                token.decimals ?? 18,
              )}
              spender={balancerPoolCreationHelper}
              token={token}
              onApproval={() => {
                // Remove token from needsApproval once approved
                setNeedsApproval((prev) =>
                  prev.filter((t) => t.address !== token.address),
                );
              }}
            />
          ))}

          {/* {needsApproval.length == 0 && !insufficientBalance && (  FIXME */}
          <ActionButton>
            <Button
              disabled={false}
              className="w-full"
              onClick={() => createPool()}
            >
              Create Pool
            </Button>
          </ActionButton>
          {/* )} */}
        </section>
      </div>
    </div>
  );
}
