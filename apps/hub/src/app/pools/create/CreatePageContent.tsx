"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { balancerVaultAbi, useBeraJs, type Token } from "@bera/berajs";
import {
  balancerDelegatedOwnershipAddress,
  balancerPoolCreationHelper,
  balancerVaultAddress,
} from "@bera/config";
import {
  ActionButton,
  ApproveButton,
  SwapFeeInput,
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
import { isAddress, parseUnits, zeroAddress } from "viem";

import BeraTooltip from "~/components/bera-tooltip";
import CreatePoolInitialLiquidityInput from "~/components/create-pool/create-pool-initial-liquidity-input";
import CreatePoolInput from "~/components/create-pool/create-pool-input";
import { useCreatePool } from "~/hooks/useCreatePool";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import { TokenInput } from "~/hooks/useMultipleTokenInput";
import { usePollPoolCreationRelayerApproval } from "~/hooks/usePollPoolCreationRelayerApproval";
import { getPoolUrl } from "../fetchPools";

const emptyToken: TokenInput = {
  address: "" as `0x${string}`,
  amount: "0",
  decimals: 18,
  exceeding: false,
  name: "",
  symbol: "",
};

type OwnershipType = "governance" | "fixed" | "custom";
const ONE_IN_18_DECIMALS = BigInt(10 ** 18); // i.e 100% in 18 decimals

export default function CreatePageContent() {
  const router = useRouter();
  const { captureException, track } = useAnalytics();
  const { account, isConnected } = useBeraJs();

  const [tokens, setTokens] = useState<TokenInput[]>([emptyToken, emptyToken]);
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [swapFee, setSwapFee] = useState<number>(0.1);
  const [owner, setOwner] = useState<string>(balancerDelegatedOwnershipAddress);
  const [poolName, setPoolName] = useState<string>("");
  const [poolSymbol, setPoolSymbol] = useState<string>("");
  const [amplification, setAmplification] = useState<number>(1); // NOTE: min is 1 max is 5000
  const [invalidAddressErrorMessage, setInvalidAddressErrorMessage] = useState<
    string | null
  >(null);
  const [ownershipType, setOwnerShipType] =
    useState<OwnershipType>("governance");

  // handle max/min tokens per https://docs.balancer.fi/concepts/pools/more/configuration.html
  const minTokensLength = 2; // i.e. for meta/stable it's 2
  const maxTokensLength = poolType === PoolType.Weighted ? 8 : 5; // i.e. for meta/stable it's 5

  // check for token approvals
  const { needsApproval: tokensNeedApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovalsWithSlippage(tokens, balancerVaultAddress);

  // Get relayer approval status and refresh function
  // NOTE: if useTxn isnt here we dont receive updates properly for out submit button
  const {
    data: isRelayerApproved,
    isLoading: isLoadingRelayerStatus,
    error: isRelayerApprovalError,
    refreshPoolCreationApproval,
  } = usePollPoolCreationRelayerApproval();

  // Use useTxn for the approval
  const {
    write,
    ModalPortal: ModalPortalRelayerApproval,
    isLoading: isRelayerApprovalLoading,
    isSubmitting: isRelayerApprovalSubmitting,
  } = useTxn({
    message: "Approving the Pool Creation Helper...",
    onSuccess: () => {
      refreshPoolCreationApproval();
    },
    onError: (e) => {
      setErrorMessage("Error approving relayer.");
    },
  });

  const handleRelayerApproval = async () => {
    if (!account || !balancerVaultAddress) {
      console.error("Missing account or balancerVaultAddress");
      return;
    }
    try {
      await write({
        address: balancerVaultAddress,
        abi: balancerVaultAbi,
        functionName: "setRelayerApproval",
        params: [account, balancerPoolCreationHelper, true],
      });
    } catch (error) {
      setErrorMessage(
        "Error approving PoolCreationHelper as a Relayer on Vault contract",
      );
    }
  };

  useEffect(() => {
    if (isRelayerApprovalError) {
      setErrorMessage("Error loading relayer approval status");
    }
  }, [isRelayerApprovalError]);

  const [weights, setWeights] = useState<bigint[]>([
    500000000000000000n,
    500000000000000000n,
  ]);
  const [lockedWeights, setLockedWeights] = useState<boolean[]>([false, false]);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [weightsError, setWeightsError] = useState<string | null>(null);

  // Function to normalize weights based on locked and unlocked tokens, apply correction to lowest unlocked token / raise error
  const normalizeWeights = (updatedWeights: bigint[]) => {
    const allLocked = lockedWeights.every((locked) => locked);
    if (allLocked) {
      return updatedWeights;
    }

    const totalLockedWeight = updatedWeights.reduce(
      (sum, weight, i) => (lockedWeights[i] ? sum + weight : sum),
      BigInt(0),
    );

    const remainingWeight = ONE_IN_18_DECIMALS - totalLockedWeight;
    const unlockedCount = updatedWeights.reduce(
      (count, _, i) => (!lockedWeights[i] ? count + 1 : count),
      0,
    );

    const normalizedWeights = updatedWeights.map((weight, i) =>
      !lockedWeights[i] ? remainingWeight / BigInt(unlockedCount) : weight,
    );

    const weightSum = normalizedWeights.reduce(
      (sum, weight) => sum + weight,
      BigInt(0),
    );
    const correction = ONE_IN_18_DECIMALS - weightSum;

    if (correction !== 0n) {
      const minUnlockedWeightIndex = normalizedWeights.reduce(
        (minIndex, weight, i) =>
          !lockedWeights[i] &&
          (minIndex === -1 || weight < normalizedWeights[minIndex])
            ? i
            : minIndex,
        -1,
      );

      if (minUnlockedWeightIndex !== -1) {
        normalizedWeights[minUnlockedWeightIndex] += correction;
      }
    }

    return normalizedWeights;
  };

  // Debounced normalization so user can type in weights without it constantly normalizing
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNormalizing(true);
      setWeights((prevWeights) => normalizeWeights(prevWeights));
      setIsNormalizing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [weights, lockedWeights]);

  // Display errors when weights are invalid (gates pool creation)
  useEffect(() => {
    if (poolType === PoolType.Weighted) {
      const totalWeight = weights.reduce(
        (sum, weight) => sum + weight,
        BigInt(0),
      );
      if (
        weights.some((weight) => weight <= 0n || weight >= ONE_IN_18_DECIMALS)
      ) {
        setWeightsError("Weights must be larger than 0% and less than 100%");
      } else if (totalWeight > ONE_IN_18_DECIMALS) {
        setWeightsError("Total weight exceeds 100%");
      } else if (totalWeight < ONE_IN_18_DECIMALS) {
        setWeightsError("Total weight is less than 100%");
      } else {
        setWeightsError(null);
      }
    } else {
      // NOTE: even though we may update weights array in stable create UX we will never pass it to the create on-chain
      setWeightsError(null);
    }
  }, [weights, poolType]);

  // Update token selection and reset weights when we change tokens
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
      const tokenCount = prevWeights.length;
      const equalWeight = ONE_IN_18_DECIMALS / BigInt(tokenCount);
      return prevWeights.map((w, i) => (!lockedWeights[i] ? equalWeight : w));
    });
  };

  // Handle when a user types in a new weight - NOTE: we allow changes even if they exceed 100% on locked weight
  const handleWeightChange = (index: number, newWeight: bigint) => {
    setLockedWeights((prevLocked) => {
      const updatedLocked = [...prevLocked];
      updatedLocked[index] = true;
      return updatedLocked;
    });

    setWeights((prevWeights) => {
      const updatedWeights = prevWeights.map((weight, i) =>
        i === index ? newWeight : weight,
      );
      return updatedWeights;
    });
  };

  // Toggle lock status for specific weight
  const handleLockToggle = (index: number) => {
    setLockedWeights((prevLocked) => {
      const updatedLocked = [...prevLocked];
      updatedLocked[index] = !updatedLocked[index];
      return updatedLocked;
    });
  };

  // Remove a token and adjust remaining weights (respecting unlocked/locked)
  const handleRemoveToken = (index: number) => {
    if (tokens.length > minTokensLength) {
      setTokens((prevTokens) => prevTokens.filter((_, i) => i !== index));
      setWeights((prevWeights) => {
        const updatedWeights = prevWeights.filter((_, i) => i !== index);
        return normalizeWeights(updatedWeights);
      });

      setLockedWeights((prevLocked) =>
        prevLocked.filter((_, i) => i !== index),
      );
    }
  };

  // Add a new token and evenly distribute weights
  const addTokenInput = () => {
    if (tokens.length < maxTokensLength) {
      setTokens([...tokens, emptyToken]);
      setWeights((prevWeights) => {
        const totalExistingWeight = prevWeights.reduce(
          (sum, weight) => sum + weight,
          BigInt(0),
        );
        const updatedWeights = [
          ...prevWeights,
          ONE_IN_18_DECIMALS - totalExistingWeight,
        ];
        return normalizeWeights(updatedWeights);
      });
      setLockedWeights([...lockedWeights, false]);
    }
  };

  // Adjust tokens and weights if pool type changes, without resetting everything
  useEffect(() => {
    if (tokens.length > maxTokensLength) {
      setTokens(tokens.slice(0, maxTokensLength));
      setWeights(normalizeWeights(weights.slice(0, maxTokensLength)));
      setLockedWeights(lockedWeights.slice(0, maxTokensLength));
    }
  }, [poolType]);

  // Initialize useCreatePool hook to get pool setup data and arguments for creating pool
  const {
    generatedPoolName,
    generatedPoolSymbol,
    isDupePool,
    dupePool,
    createPoolArgs,
    isLoadingPools,
    errorLoadingPools,
  } = useCreatePool({
    tokens,
    normalizedWeights: weights,
    poolType,
    swapFee,
    poolName,
    poolSymbol,
    owner,
    amplification,
  });

  // Synchronize the generated pool name and symbol with state
  useEffect(() => {
    setPoolName(generatedPoolName);
    setPoolSymbol(generatedPoolSymbol);
  }, [generatedPoolName, generatedPoolSymbol]);

  // Create the pool with UX feedback
  const {
    write: writeCreatePool,
    ModalPortal,
    isLoading: isLoadingCreatePoolTx,
    isSubmitting: isSubmittingCreatePoolTx,
  } = useTxn({
    message: "Creating new pool...",
    onSuccess: () => {
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
          <h2 className="self-start text-3xl font-semibold">
            Select a Pool Type
          </h2>
          <div className="flex w-full flex-row gap-6">
            <Card
              onClick={() => setPoolType(PoolType.ComposableStable)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border border-border p-4",
                poolType === PoolType.ComposableStable &&
                  "border-info-foreground ",
              )}
            >
              <span className="text-lg font-semibold">Stable</span>
              {/* NOTE: we are actually creating ComposableStable pools under the hood, which are functionally the same. */}
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Recommended for stable pairs
              </span>
            </Card>
            <Card
              onClick={() => setPoolType(PoolType.Weighted)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border border-border p-4",
                poolType === PoolType.Weighted && "border-info-foreground ",
              )}
            >
              <span className="text-lg font-semibold">Weighted</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Customize the weights of tokens
              </span>
            </Card>
            <Card
              onClick={() => {}} //setPoolType(PoolType.MetaStable)}
              className={cn(
                "flex w-full cursor-not-allowed flex-col gap-0 border border-border p-4 opacity-50", // FIXME enable when we get rateProviders working
                poolType === PoolType.MetaStable && "border-info-foreground ",
              )}
            >
              <span className="text-lg font-semibold">MetaStable</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                The most efficient pool type for two highly correlated tokens
              </span>
            </Card>
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <h2 className="self-start text-3xl font-semibold">Select Tokens</h2>
          <div className="flex w-full flex-col gap-6">
            {tokens.map((token, index) => (
              <CreatePoolInput
                key={`token-${index}`}
                token={token}
                selectedTokens={tokens}
                weight={weights[index]}
                displayWeight={poolType === PoolType.Weighted}
                locked={lockedWeights[index]}
                displayRemove={tokens.length > minTokensLength}
                index={index}
                onTokenSelection={(selectedToken) =>
                  handleTokenSelection(selectedToken, index)
                }
                onWeightChange={handleWeightChange}
                onLockToggle={handleLockToggle}
                onRemoveToken={handleRemoveToken}
              />
            ))}
            {tokens.length < maxTokensLength && (
              <div className="mr-auto">
                <Button onClick={addTokenInput} variant="ghost">
                  + Add Token
                </Button>
              </div>
            )}
          </div>
          {weightsError && (
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{weightsError}</AlertDescription>
            </Alert>
          )}
        </section>

        {isDupePool && dupePool && (
          <Alert variant="destructive">
            <AlertTitle>Similar Pool Exists</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                {`Please note that a ${poolType} pool with the same tokens 
                exists, consider adding liquidity instead of creating a new pool:`}
              </p>
              <a href={getPoolUrl(dupePool)} className="text-sky-600 underline">
                Existing pool
              </a>
            </AlertDescription>
          </Alert>
        )}

        <section className="flex w-full flex-col gap-4">
          <h2 className="self-start text-3xl font-semibold">
            Set Initial Liquidity
          </h2>
          <div className="flex flex-col gap-4">
            <ul className="divide-y divide-border rounded-lg border">
              {tokens.map((token, index) => (
                <CreatePoolInitialLiquidityInput
                  key={`liq-${index}`}
                  disabled={false}
                  token={token as Token}
                  tokenAmount={token.amount}
                  onTokenUSDValueChange={(usdValue) => {}} // FIXME: we should use this to handle incorrect liquidity supply
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
              ))}
            </ul>
            {poolType === PoolType.Weighted && (
              <p>
                Warning: if you seed liquidity in amounts that differ (in terms
                of USD) from the weighting you are likely to encounter arbitrage
                after pool creation.
              </p>
            )}
          </div>

          {errorMessage && (
            <Alert
              variant="destructive"
              className="my-4 text-destructive-foreground"
            >
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </section>
        <section className="flex w-full flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 className="self-start text-3xl font-semibold">Set Swap Fee</h2>
            <div className="pt-2">
              <BeraTooltip
                size="lg"
                wrap={true}
                text={`There is lots of discussion and research around how to best set a swap fee amount, 
                    but a general rule of thumb is for stable assets it should be lower (ex: 0.1%) 
                    and non-stable pairs should be higher (ex: 0.3%).`}
              />
            </div>
          </div>
          <Card className="flex w-full cursor-pointer flex-col gap-0 border p-4">
            <SwapFeeInput
              initialFee={swapFee}
              onFeeChange={(fee) => {
                setSwapFee(fee);
              }}
            />
          </Card>

          <div className="flex items-center gap-1">
            <div className="self-start font-semibold">Fees Modified By</div>
            <div className="pt-[-1]">
              <BeraTooltip
                size="lg"
                wrap={true}
                text={`The owner of the pool has the ability to make changes to the pool such as setting the swap fee. 
                    You can set the owner to 0x0000000000000000000000000000000000000000 to set a permanent fee upon pool creation. 
                    However in general the recommendation is to allow Balancer governance (and delegated addresses) 
                    to dynamically adjust the fees. This is done by setting an owner of 0xba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1b.`}
              />
            </div>
          </div>

          <div className="flex w-full flex-row gap-6">
            <Card
              onClick={() => {
                setOwnerShipType("governance");
                setOwner(balancerDelegatedOwnershipAddress);
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border border-border p-4",
                ownershipType === "governance" && "border-info-foreground ",
              )}
            >
              <span className="text-lg font-semibold">Governance</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Enables fee modification through governance
              </span>
            </Card>
            <Card
              onClick={() => {
                setOwnerShipType("fixed");
                setOwner("0x0000000000000000000000000000000000000000");
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border border-border p-4",
                ownershipType === "fixed" && "border-info-foreground ",
              )}
            >
              <span className="text-lg font-semibold">Fixed</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Fee is fixed and unmodifiable
              </span>
            </Card>
            <Card
              onClick={() => {
                setOwnerShipType("custom");
                setOwner(account || zeroAddress);
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-0 border border-border p-4",
                ownershipType === "custom" && "border-info-foreground ",
              )}
            >
              <span className="text-lg font-semibold">Custom Address</span>
              <span className="mt-[-4px] text-sm text-muted-foreground">
                Update fees through a custom address
              </span>
            </Card>
          </div>
          <InputWithLabel
            label="Owner Address"
            disabled={ownershipType !== "custom"}
            value={owner}
            maxLength={42}
            onChange={(e) => {
              const value = e.target.value;
              setOwner(value);
              if (!isAddress(value)) {
                setInvalidAddressErrorMessage("Invalid custom address");
              } else {
                setInvalidAddressErrorMessage(null);
              }
            }}
          />
          {invalidAddressErrorMessage && (
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{invalidAddressErrorMessage}</AlertDescription>
            </Alert>
          )}
        </section>

        <section className="flex w-full flex-col gap-4">
          <InputWithLabel
            label="Pool Name"
            value={poolName}
            maxLength={85}
            onChange={(e) => {
              setPoolName(e.target.value);
            }}
          />

          <InputWithLabel
            label="Pool Symbol"
            value={poolSymbol}
            maxLength={85}
            onChange={(e) => {
              setPoolSymbol(e.target.value.replace(" ", "-"));
            }}
          />

          {(poolType === PoolType.ComposableStable ||
            poolType === PoolType.MetaStable) && (
            <InputWithLabel
              label="Amplification"
              value={amplification}
              maxLength={4}
              onChange={(e) => {
                // NOTE: for some reason max/min dont seem to work in InputWithLabel
                const value = Number(e.target.value);
                if (value >= 1 && value <= 5000) {
                  setAmplification(value);
                }
              }}
              tooltip={
                <BeraTooltip
                  size="lg"
                  wrap={true}
                  text={`
                  The amplification co-efficient ("A") determines a pool's 
                  tolerance for imbalance between the assets within it.
                  A higher value means that trades will incur slippage sooner 
                  as the assets within the pool become imbalanced.`}
                />
              }
            />
          )}
        </section>

        <section className="flex w-full flex-col gap-10">
          <h2 className="self-start text-3xl font-semibold">
            Approve & Submit
          </h2>

          {/* TODO: below belongs in a preview page */}
          {!isRelayerApproved ? (
            <ActionButton>
              <Button
                disabled={
                  !isConnected ||
                  isRelayerApprovalLoading ||
                  isLoadingRelayerStatus ||
                  isRelayerApprovalSubmitting
                }
                onClick={handleRelayerApproval}
                className="mt-4 w-full"
              >
                Approve Pool Creation Helper
                {(isRelayerApprovalLoading || isRelayerApprovalSubmitting) &&
                  "..."}
              </Button>
            </ActionButton>
          ) : tokensNeedApproval.length > 0 ? (
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
                  disabled={approvalAmount === BigInt(0) || !isConnected}
                  token={approvalToken}
                  spender={balancerVaultAddress}
                  onApproval={() => refreshAllowances()}
                />
              );
            })()
          ) : (
            <ActionButton>
              <Button
                disabled={
                  !isConnected ||
                  !createPoolArgs ||
                  tokensNeedApproval.length > 0 ||
                  !isRelayerApproved ||
                  !isAddress(owner) ||
                  poolName.length === 0 ||
                  poolSymbol.length === 0 ||
                  isLoadingCreatePoolTx ||
                  isSubmittingCreatePoolTx ||
                  isLoadingPools ||
                  errorLoadingPools ||
                  isNormalizing ||
                  weightsError !== null
                }
                className="w-full"
                onClick={() => {
                  console.log("createPoolArgs", createPoolArgs);
                  writeCreatePool(createPoolArgs);
                }}
              >
                Create Pool
                {(isLoadingCreatePoolTx || isSubmittingCreatePoolTx) && "..."}
              </Button>
            </ActionButton>
          )}
        </section>
      </div>
    </div>
  );
}
