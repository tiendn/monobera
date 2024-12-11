"use client";

import {
  Dispatch,
  ReactElement,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  TransactionActionType,
  useBeraJs,
  useCollateralsRates,
  usePollAllowance,
  usePollBalance,
  usePollHoneyPreview,
  useTokens,
  useIsBadCollateralAsset,
  useIsBasketModeEnabled,
  type Token,
  useCollateralWeights,
  IContractWrite,
  TokenWithAmount,
} from "@bera/berajs";
import { honeyFactoryAddress, honeyTokenAddress } from "@bera/config";
import { useAnalytics, useTxn } from "@bera/shared-ui";
import BigNumber from "bignumber.js";
import { Abi, formatUnits, getAddress, parseUnits, type Address } from "viem";
import useMultipleTokenApprovals from "./useMultipleTokenApprovals";

interface PsmHookReturn {
  account: string | undefined;
  payload: readonly [Address, bigint, Address, boolean] | undefined;
  isLoading: boolean;
  selectedFrom: Token[] | undefined;
  selectedTo: Token[] | undefined;
  fee: number;
  isReady: boolean | undefined;
  isFeeLoading: boolean;
  fromAmount: string[];
  toAmount: string[];
  isMint: boolean;
  fromBalance: Array<string | undefined>;
  toBalance: Array<string | undefined>;
  ModalPortal: ReactElement<any, any>;
  needsApproval: TokenWithAmount[];
  exceedBalance: boolean[];
  honey: Token | undefined;
  collateralList: Token[] | undefined;
  isTyping: boolean;
  isBadCollateral: boolean | undefined;
  isBasketModeEnabled: boolean | undefined;
  collateralWeights: Record<Address, bigint> | undefined;
  setSelectedFrom: Dispatch<SetStateAction<Token[]>>;
  setSelectedTo: Dispatch<SetStateAction<Token[]>>;
  setFromAmount: Dispatch<SetStateAction<string[]>>;
  setToAmount: Dispatch<SetStateAction<string[]>>;
  setGivenIn: Dispatch<SetStateAction<boolean>>;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  onSwitch: () => void;
  refreshAllowances: () => void;
  write: (args: IContractWrite<Abi, string>) => void;
}

/**
 * A React hook for managing PSM (Peg Stability Module) operations in the Honey protocol.
 * Handles minting and redeeming of Honey tokens with various collateral assets.
 *
 * @returns {PsmHookReturn} An object containing the hook's return values.
 */
export const usePsm = (): PsmHookReturn => {
  // Track whether user is currently typing amounts
  const [isTyping, setIsTyping] = useState(false);
  // State for selected tokens and amounts
  const [selectedTo, setSelectedTo] = useState<Token[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<Token[]>([]);
  const [givenIn, setGivenIn] = useState<boolean>(true);
  // State for input/output amounts
  const [fromAmount, setFromAmount] = useState<string[]>([]);
  const [toAmount, setToAmount] = useState<string[]>([]);
  const { isReady, account } = useBeraJs();

  // Get token data and filter for collateral tokens
  const { data: tokenData } = useTokens();
  const collateralList = tokenData?.tokenList?.filter((token: any) =>
    token.tags?.includes("collateral"),
  );
  const honey = tokenData?.tokenDictionary
    ? tokenData?.tokenDictionary[getAddress(honeyTokenAddress)]
    : undefined;
  // Find the default collateral token and get the HONEY token
  const defaultCollateral = collateralList?.find((token: any) =>
    token.tags.includes("defaultCollateral"),
  );

  // Determine if operation is mint (true) or redeem (false)
  // Mint: input is collateral, output is HONEY
  // Redeem: input is HONEY, output is collateral
  const isMint = selectedFrom?.length
    ? selectedFrom?.[0].address !== honey?.address
    : true;

  // Check if basket mode is enabled for current operation
  const { data: isBasketModeEnabled } = useIsBasketModeEnabled({ isMint });

  // ===== INITIAL SELECTIONS =====
  // Initialize default selections when tokens are loaded
  useEffect(() => {
    if (
      defaultCollateral &&
      honey &&
      !selectedFrom?.length &&
      !selectedTo?.length
    ) {
      // Create initial collateral list with default first
      const initCollateralList = collateralList?.length
        ? [
            defaultCollateral,
            ...collateralList.filter(
              (token) => token.address !== defaultCollateral?.address,
            ),
          ]
        : [defaultCollateral];

      setSelectedFrom(initCollateralList);
      setSelectedTo([honey]);
    }
  }, [collateralList, honey]);

  // Get collateral tokens based on operation type
  const collaterals = isMint ? selectedFrom : selectedTo;

  // ===== BAD COLLATERAL =====
  // Check if selected collaterals are flagged as bad (blacklisted or depegged)
  const isBadCollateral1 = useIsBadCollateralAsset({
    collateral: collaterals?.[0]?.address as Address,
  });
  const isBadCollateral2 = useIsBadCollateralAsset({
    collateral:
      (collaterals?.[1]?.address as Address) ||
      getAddress("0x0000000000000000000000000000000000000000"),
  });
  const isBadCollateral =
    isBadCollateral1.data?.isBlacklisted ||
    isBadCollateral1.data?.isDepegged ||
    isBadCollateral2.data?.isBlacklisted ||
    isBadCollateral2.data?.isDepegged;

  // ===== TOKEN BALANCES =====
  // retrieve token balances for both input and output tokens
  const fromBalance1 = usePollBalance({
    address:
      selectedFrom?.[0]?.address ||
      getAddress("0x0000000000000000000000000000000000000000"),
  });
  const fromBalance2 = usePollBalance({
    address:
      selectedFrom?.[1]?.address ||
      getAddress("0x0000000000000000000000000000000000000000"),
  });
  const fromBalance = [
    fromBalance1.data?.formattedBalance,
    fromBalance2.data?.formattedBalance,
  ];
  const tobalance1 = usePollBalance({
    address:
      selectedTo?.[0]?.address ||
      getAddress("0x0000000000000000000000000000000000000000"),
  });
  const toBalance2 = usePollBalance({
    address:
      selectedTo?.[1]?.address ||
      getAddress("0x0000000000000000000000000000000000000000"),
  });
  const toBalance = [
    tobalance1.data?.formattedBalance,
    toBalance2.data?.formattedBalance,
  ];

  // ===== TOKEN ALLOWANCES =====
  // retrieve token allowances for spending
  const allowance1 = usePollAllowance({
    spender: honeyFactoryAddress,
    token: selectedFrom?.[0] ?? undefined,
  });
  const allowance2 = usePollAllowance({
    spender: honeyFactoryAddress,
    token: selectedFrom?.[1] ?? undefined,
  });

  // ===== FEE =====
  // Get current fees for selected collateral
  const { getCollateralRate, isLoading: isFeeLoading } = useCollateralsRates({
    collateralList: collateralList?.map((token: any) => token.address) ?? [],
  });
  const params = collaterals?.length
    ? getCollateralRate(collaterals[0].address as Address)
    : undefined;
  const fee = params ? (isMint ? params.mintFee : params.redeemFee) : 0;

  // ===== COLLATERAL WEIGHTS =====
  // Get collateral weights for basket mode
  const { data: collateralWeights } = useCollateralWeights();

  // create the write transaction to actually mint or redeem
  // Analytics
  const { captureException, track } = useAnalytics();
  const {
    write,
    isLoading: isUseTxnLoading,
    ModalPortal,
  } = useTxn({
    message: isMint
      ? `Mint ${
          Number(toAmount) < 0.01 ? "<0.01" : Number(toAmount).toFixed(2)
        } Honey`
      : `Redeem ${
          Number(fromAmount) < 0.01 ? "<0.01" : Number(fromAmount).toFixed(2)
        } Honey`,
    actionType: isMint
      ? TransactionActionType.MINT_HONEY
      : TransactionActionType.REDEEM_HONEY,
    onSuccess: () => {
      track(`${isMint ? "mint" : "redeem"}_honey`);
    },
    onError: (e: Error | undefined) => {
      track(`${isMint ? "mint" : "redeem"}_honey_failed`);
      captureException(e);
    },
  });

  // Calculate amounts when inputs change
  const { data: previewRes, isLoading: isHoneyPreviewLoading } =
    usePollHoneyPreview({
      collateral: isTyping ? undefined : collaterals?.[0],
      collateralList: isBasketModeEnabled ? collateralList : undefined,
      amount: (givenIn ? fromAmount[0] : toAmount[0]) ?? "0",
      mint: isMint,
      given_in: givenIn,
      isBasketModeEnabled: !!isBasketModeEnabled,
    });

  // Update amounts based on preview results
  useEffect(() => {
    if (givenIn) setToAmount(previewRes ?? []);
    else setFromAmount(previewRes ?? []);
  }, [previewRes]);

  // Switch between mint and redeem operations
  const onSwitch = () => {
    const tempFromAmount = fromAmount;
    const tempToAmount = toAmount;

    const tempFrom = selectedFrom;
    const tempTo = selectedTo;

    setSelectedFrom(tempTo);
    setSelectedTo(tempFrom);

    setFromAmount(tempToAmount);
    setToAmount(tempFromAmount);
    setGivenIn(!givenIn);
  };

  // Update token weights when in basket mode with bad collateral
  useEffect(() => {
    if (
      isBadCollateral &&
      collateralWeights &&
      selectedFrom.length &&
      selectedTo.length
    ) {
      selectedFrom.forEach((token) => {
        const weight = collateralWeights[token.address];
        if (weight) {
          token.weight = Math.round(Number(formatUnits(weight, 18)));
        }
      });
    }
  }, [collateralWeights, isBasketModeEnabled]);

  // Prepare transaction payload
  const payload =
    collaterals && account
      ? ([
          collaterals?.[0]?.address,
          parseUnits(
            fromAmount?.[0] ?? "0",
            (isMint ? collaterals?.[0]?.decimals : honey?.decimals) ?? 18,
          ),
          account ?? ("" as Address),
          !!isBasketModeEnabled,
        ] as const)
      : undefined;

  // ===== TOKEN APPROVALS =====
  // Check token approvals and balance limits
  const { needsApproval, refresh: refreshAllowances } =
    useMultipleTokenApprovals(
      selectedFrom?.map((token, idx) => ({
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        address: token.address,
        exceeding: false,
        amount: fromAmount?.[idx] ?? "0",
      })) ?? [],
      honeyFactoryAddress,
    );

  // ===== EXCEEDING BALANCE =====
  // Check if the input amount exceeds the balance
  const exceedBalance = [
    BigNumber(fromAmount?.[0] ?? "0").gt(fromBalance?.[0] ?? "0"),
    BigNumber(fromAmount?.[1] ?? "0").gt(fromBalance?.[1] ?? "0"),
  ];

  const isLoading = isUseTxnLoading || isHoneyPreviewLoading;
  return {
    account,
    payload,
    isLoading,
    selectedFrom,
    selectedTo,
    fee,
    isReady,
    isFeeLoading,
    fromAmount,
    toAmount,
    isMint,
    fromBalance,
    toBalance,
    ModalPortal,
    exceedBalance,
    needsApproval,
    honey,
    collateralList,
    isTyping,
    isBadCollateral,
    isBasketModeEnabled,
    collateralWeights,
    onSwitch,
    setSelectedTo,
    setFromAmount,
    setToAmount,
    setGivenIn,
    setIsTyping,
    setSelectedFrom,
    refreshAllowances,
    write,
  };
};
