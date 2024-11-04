"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PoolWithMethods, parseFixed } from "@balancer-labs/sdk";
import {
  ADDRESS_ZERO,
  TransactionActionType,
  balancerPoolCreationHelperAbi,
  balancerVaultAbi,
  useBeraContractWrite,
  useBeraJs,
  type Token,
} from "@bera/berajs";
import { getAllowances, getWalletBalances } from "@bera/berajs/actions";
import {
  balancerPoolCreationHelper,
  balancerVaultAddress,
  chainId,
} from "@bera/config";
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
  PoolType,
  composableStableFactoryV5Abi_V2,
} from "@berachain-foundation/berancer-sdk";
import {
  Address,
  Log,
  TransactionReceipt,
  decodeEventLog,
  encodeFunctionData,
  formatUnits,
  keccak256,
  parseUnits,
  zeroAddress,
} from "viem";
import { usePublicClient } from "wagmi";

import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import { usePools } from "~/b-sdk/usePools";

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

  const { account, config: beraConfig } = useBeraJs();
  const publicClient = usePublicClient();

  const [baseToken, quoteTokens] = useMemo(() => {
    // FIXME this is an awkward way to store these, and we should really be storing BigInt amounts as well
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
          spender: balancerVaultAddress,
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

  // // approve relayer (PoolCreationHelper) to spend tokens on your behalf
  // // FIXME: we need to move this into an approval button or into the multi-approval hook for tokens
  const {
    write: writeApproveRelayer,
    ModalPortal: ModalPortalRelayerApproval,
    isSuccess: isApproveRelayerSuccess,
    isError: isApproveRelayerError,
    isLoading: isApproveRelayerLoading,
  } = useTxn({
    message: "Creating new pool...",
    onSuccess: async (hash: string) => {
      console.log("APPROVED RELAYER");
    },
    onError: (e) => {
      setErrorMessage(
        `Error approving pool creation helper on vault: ${e?.message}`,
      );
    },
  });

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

          {/* Handle approvals -- FIXME: this UX sucks, merge all of these together like in add-liquidity */}
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
              spender={balancerVaultAddress}
              token={token}
              onApproval={() => {
                // Remove token from needsApproval once approved
                setNeedsApproval((prev) =>
                  prev.filter((t) => t.address !== token.address),
                );
              }}
            />
          ))}
          <ActionButton>
            <Button
              disabled={isApproveRelayerSuccess || isApproveRelayerLoading}
              className="w-full"
              onClick={() => {
                // FIXME: this is strange, we either need to bundle with the token amount approvals or we need to useTxn
                writeApproveRelayer({
                  address: balancerVaultAddress,
                  abi: balancerVaultAbi,
                  functionName: "setRelayerApproval",
                  params: [
                    account as `0x${string}`,
                    balancerPoolCreationHelper,
                    true,
                  ],
                });
              }}
            >
              Approve PoolCreationHelper
            </Button>
          </ActionButton>

          <ActionButton>
            <Button
              disabled={
                false
                // FIXME: we need to enable only once approval and balancer checks + amounts are good
              }
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
                const amountsIn = [
                  parseUnits(baseAmount, baseToken?.decimals ?? 18),
                  ...quoteAmounts.map((amt, idx) =>
                    parseUnits(amt, quoteTokens[idx]?.decimals ?? 18),
                  ),
                ];
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
                    keccak256(Buffer.from(`${name}-${owner}`)),
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
                    keccak256(Buffer.from(`${name}-${owner}`)),
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
          {/* )} */}
        </section>
      </div>
    </div>
  );
}
