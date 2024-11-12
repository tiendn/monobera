"use client";

import { useEffect, useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@bera/ui/alert";
import { Button } from "@bera/ui/button";
import { Icons } from "@bera/ui/icons";
import { InputWithLabel } from "@bera/ui/input";
import { Separator } from "@bera/ui/separator";
import { PoolType } from "@berachain-foundation/berancer-sdk";
import { isAddress, parseUnits, zeroAddress } from "viem";

import BeraTooltip from "~/components/bera-tooltip";
import { usePoolWeights } from "~/b-sdk/usePoolWeights";
import { useCreatePool } from "~/hooks/useCreatePool";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import { TokenInput } from "~/hooks/useMultipleTokenInput";
import { usePollPoolCreationRelayerApproval } from "~/hooks/usePollPoolCreationRelayerApproval";
import CreatePoolInitialLiquidityInput from "../components/create-pool-initial-liquidity-input";
import CreatePoolInput from "../components/create-pool-input";
import OwnershipInput, { OwnershipType } from "../components/ownership-input";
import PoolTypeSelector from "../components/pool-type-selector";
import { getPoolUrl } from "../fetchPools";

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
  const { account, isConnected } = useBeraJs();

  const [tokens, setTokens] = useState<TokenInput[]>([emptyToken, emptyToken]);
  const [poolType, setPoolType] = useState<PoolType>(PoolType.ComposableStable);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [swapFee, setSwapFee] = useState<number>(0.1);
  const [owner, setOwner] = useState<string>(balancerDelegatedOwnershipAddress);
  const [poolName, setPoolName] = useState<string>("");
  const [poolSymbol, setPoolSymbol] = useState<string>("");
  const [amplification, setAmplification] = useState<number>(1); // NOTE: min is 1 max is 5000
  const [ownershipType, setOwnerShipType] =
    useState<OwnershipType>("governance");
  const [invalidAddressErrorMessage, setInvalidAddressErrorMessage] = useState<
    string | null
  >(null);

  const handleOwnershipTypeChange = (type: OwnershipType) => {
    setOwnerShipType(type);
    setOwner(
      type === "governance"
        ? balancerDelegatedOwnershipAddress
        : type === "fixed"
          ? "0x0000000000000000000000000000000000000000"
          : account || zeroAddress,
    );
  };

  const handleOwnerChange = (address: string) => {
    setOwner(address);
    setInvalidAddressErrorMessage(
      isAddress(address) ? null : "Invalid custom address",
    );
  };

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

  const {
    weights,
    lockedWeights,
    weightsError,
    handleWeightChange,
    toggleLock,
    addWeight,
    removeWeight,
  } = usePoolWeights([500000000000000000n, 500000000000000000n]);

  const addTokenInput = () => {
    if (tokens.length < maxTokensLength) {
      setTokens([...tokens, emptyToken]);
      addWeight();
    }
  };

  const handleRemoveToken = (index: number) => {
    if (tokens.length > minTokensLength) {
      setTokens((prevTokens) => prevTokens.filter((_, i) => i !== index));
      removeWeight(index);
    }
  };

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
  };

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
    <div className="flex w-full max-w-[600px] flex-col items-center justify-center gap-6">
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
        <PoolTypeSelector poolType={poolType} onPoolTypeChange={setPoolType} />

        <section className="flex w-full flex-col gap-4">
          <h2 className="self-start text-3xl font-semibold">{`Select Tokens ${
            poolType === PoolType.Weighted ? "& Weighting" : ""
          }`}</h2>
          <div className="flex w-full flex-col gap-2">
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
                onLockToggle={toggleLock}
                onRemoveToken={handleRemoveToken}
              />
            ))}
          </div>

          {tokens.length < maxTokensLength && (
            <>
              <Separator className="text-muted-foreground opacity-50" />
              <div className="mr-auto -translate-x-4">
                <Button
                  onClick={addTokenInput}
                  variant="ghost"
                  className="text-foreground"
                >
                  <Icons.plusCircle className="h-6 w-6" />
                  <p className="pl-2"> Add Token</p>
                </Button>
              </div>
            </>
          )}
          {weightsError && (
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{weightsError}</AlertDescription>
            </Alert>
          )}
          {isDupePool && dupePool && (
            <Alert variant="destructive">
              <AlertTitle>Similar Pool Exists</AlertTitle>
              <AlertDescription className="space-y-4">
                <p>
                  {`Please note that a ${poolType} pool with the same tokens 
                exists, consider adding liquidity instead of creating a new pool:`}
                </p>
                <a
                  href={getPoolUrl(dupePool)}
                  className="text-sky-600 underline"
                >
                  Existing pool
                </a>
              </AlertDescription>
            </Alert>
          )}
        </section>

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
        </section>

        <OwnershipInput
          ownershipType={ownershipType}
          owner={owner}
          onChangeOwnershipType={handleOwnershipTypeChange}
          onOwnerChange={handleOwnerChange}
          invalidAddressErrorMessage={invalidAddressErrorMessage}
          swapFee={swapFee}
          onSwapFeeChange={setSwapFee}
        />

        <section className="flex w-full flex-col gap-4">
          <InputWithLabel
            label="Pool Name"
            variant="black"
            className="bg-transparent"
            value={poolName}
            maxLength={85}
            onChange={(e) => {
              setPoolName(e.target.value);
            }}
          />

          <InputWithLabel
            label="Pool Symbol"
            variant="black"
            className="bg-transparent"
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
              variant="black"
              className="bg-transparent"
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
                  weightsError !== null ||
                  tokens.some((t) => t.amount === "0")
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
      </div>
    </div>
  );
}
