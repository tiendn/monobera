"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PoolWithMethods } from "@balancer-labs/sdk";
// FIXME: should use a v3 query for this!
import {
  ADDRESS_ZERO,
  TransactionActionType,
  balancerPoolCreationHelperAbi,
  useBeraJs,
  type Token,
} from "@bera/berajs";
import { getAllowances, getWalletBalances } from "@bera/berajs/actions";
import { balancerPoolCreationHelper, chainId } from "@bera/config";
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
import {
  CreatePoolV2ComposableStableInput,
  InitPoolInput,
  PoolType,
  composableStableFactoryV5Abi_V2,
} from "@berachain-foundation/berancer-sdk";
import {
  Address,
  Log,
  TransactionReceipt,
  decodeEventLog,
  formatUnits,
  parseUnits,
  zeroAddress,
} from "viem";
import { usePublicClient } from "wagmi";

import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import {
  balancerCreatePool,
  balancerInitPool,
  balancerInitPoolDataProvider,
} from "~/b-sdk/b-sdk";
import { usePools } from "~/b-sdk/usePools";

// FIXME move to config
const composableStablePoolFactory =
  "0x7Fb491242a27AE4AfbC75a1281e655f701952e2E" as Address;
const weightedPoolFactory =
  "0x88F2f8C9e5c5F58c3A5C94aDa338c6c341667b10" as Address;

export const findEventInReceiptLogs = ({
  receipt,
  to,
  abi,
  eventName,
}: {
  // NOTE: this source is https://github.com/balancer/b-sdk/blob/main/test/lib/utils/findEventInReceiptLogs.ts#L3
  receipt: TransactionReceipt;
  to: Address;
  abi: readonly unknown[];
  eventName: string;
}): { eventName: string; args: any } => {
  const event = receipt.logs
    .filter((log: Log) => {
      return log.address.toLowerCase() === to.toLowerCase();
    })
    .map((log) => {
      return decodeEventLog({ abi, ...log });
    })
    .find((decodedLog) => decodedLog?.eventName === eventName);
  if (!event) {
    throw new Error("Event not found in logs");
  }
  return event;
};

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
  const { account, config: beraConfig } = useBeraJs();
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
    onSuccess: async (hash: string) => {
      try {
        // Retrieve the transaction receipt with the transaction hash
        if (!publicClient) {
          throw new Error("Public client not available!");
        }

        // we need the pool creation event
        const maxAttempts = 60;
        let attempts = 0;
        let receipt = null;
        let poolAddress = null;

        while (!receipt || receipt.logs.length === 0 || !poolAddress) {
          if (attempts >= maxAttempts) {
            throw new Error("Transaction receipt not found in time");
          }

          console.log("Waiting for logs...");

          // Poll with wait to avoid tight loop
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Update receipt with a new call
          receipt = await publicClient.getTransactionReceipt({
            hash: hash as `0x${string}`,
          });

          // try and find the event
          let poolCreatedEvent;
          try {
            poolCreatedEvent = findEventInReceiptLogs({
              receipt: receipt,
              eventName: "PoolCreated",
              abi: composableStableFactoryV5Abi_V2, // FIXME should be v6
              to: composableStablePoolFactory,
            });
            console.log("poolCreatedEvent", poolCreatedEvent);
          } catch (e) {
            console.log(e);
          }
          if (poolCreatedEvent) {
            poolAddress = poolCreatedEvent.args.pool;
          }

          attempts += 1;
        }

        if (receipt.status === "success" && poolAddress) {
          await initiateJoinTransaction(poolAddress);
          track("create_pool_success");
          router.push("/pools");
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

  async function createPool() {
    // step 1: create pool
    try {
      const createPoolInput: CreatePoolV2ComposableStableInput = {
        name: poolName,
        symbol: poolSymbol,
        poolType: PoolType.ComposableStable, // FIXME
        tokens: tokens.map((token) => ({
          address: token.address as `0x${string}`,
          rateProvider: ADDRESS_ZERO as `0x${string}`,
          tokenRateCacheDuration: BigInt(100), // FIXME: from example
        })),
        amplificationParameter: BigInt(62), // FIXME: between 0 and 5k need to validate
        exemptFromYieldProtocolFeeFlag: false,
        swapFee: "0.01", // FIXME
        poolOwnerAddress: account as `0x${string}`,
        protocolVersion: 2,
        chainId,
      };

      console.log("createPoolInput", createPoolInput);
      const callData = balancerCreatePool.buildCall(createPoolInput);
      write({
        data: callData.callData,
        address: composableStablePoolFactory, // FIXME callData.to is ZERO address
      });
    } catch (err) {
      setErrorMessage(`Error creating pool: ${err}`);
      console.error("Error creating pool:", err);
    }
  }

  async function initiateJoinTransaction(poolAddress: `0x${string}`) {
    // NOTE: this is chained in useTxn so we need to throw and catch there
    // step 2: init join
    if (!publicClient || !account) {
      throw new Error("Public client not available!");
    }
    console.log("initiateJoinTransaction with poolAddress", poolAddress);

    const poolType = PoolType.ComposableStable; // FIXME
    const amountsIn = tokens.map((token, index) => ({
      address: token.address,
      decimals: token.decimals ?? 18,
      rawAmount: parseUnits(
        token === baseToken
          ? baseAmount ?? "0"
          : quoteAmounts[index - 1] ?? "0",
        token.decimals ?? 18,
      ),
    }));
    const initPoolInput: InitPoolInput = {
      sender: account,
      recipient: account,
      amountsIn,
      chainId,
    };
    const poolState = await balancerInitPoolDataProvider.getInitPoolData(
      poolAddress,
      poolType,
      2,
    );
    const callData = await balancerInitPool.buildCall(initPoolInput, poolState);

    console.log("initPoolInput", initPoolInput, poolState, callData);

    write({
      data: callData.callData,
      address: callData.to,
      value: callData.value,
    });
  }

  // check for duplicates
  useEffect(() => {
    if (!baseToken || !quoteTokens.length) return;
    if (isLoadingPools) return;

    const isDupe = pools?.find((pool) => {
      const hasAllTokens = [baseToken, ...quoteTokens].every((token) =>
        pool?.tokenAddresses?.includes(token?.address.toLowerCase()),
      );
      if (hasAllTokens && pool?.poolType.toString() === poolType.toString()) {
        // FIXME: switch to v3 query for this reason
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
              onClick={() => createPool()} // step 1 create, step 2 init
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
