"use client";

import { useEffect, useState } from "react";
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
  usePollAllowances,
} from "@bera/berajs";
import { honeyFactoryAddress, honeyTokenAddress } from "@bera/config";
import { useAnalytics, useTxn } from "@bera/shared-ui";
import BigNumber from "bignumber.js";
import { getAddress, parseUnits, type Address } from "viem";
import useMultipleTokenApprovals from "./useMultipleTokenApprovals";

export const usePsm = () => {
  const [isTyping, setIsTyping] = useState(false);

  const { data: tokenData } = useTokens();
  const collateralList = tokenData?.tokenList?.filter((token: any) =>
    token.tags?.includes("collateral"),
  );
  const defaultCollateral = collateralList?.find((token: any) =>
    token.tags.includes("defaultCollateral"),
  );
  const honey = tokenData?.tokenDictionary
    ? tokenData?.tokenDictionary[getAddress(honeyTokenAddress)]
    : undefined;

  const [selectedTo, setSelectedTo] = useState<Token[] | undefined>([]);

  const [selectedFrom, setSelectedFrom] = useState<Token[] | undefined>([]);

  const [givenIn, setGivenIn] = useState<boolean>(true);

  const isMint = selectedFrom?.length
    ? selectedFrom?.[0].address !== honey?.address
    : true;

  const { data: isBasketModeEnabled } = useIsBasketModeEnabled({ isMint });

  useEffect(() => {
    if (
      defaultCollateral &&
      honey &&
      !selectedFrom?.length &&
      !selectedTo?.length
    ) {
      const initCollateralList =
        isBasketModeEnabled && collateralList
          ? [defaultCollateral, collateralList[1]]
          : [defaultCollateral];

      setSelectedFrom(initCollateralList);
      setSelectedTo([honey]);
    }
  }, [collateralList, honey]);

  const [fromAmount, setFromAmount] = useState<string[]>([]);

  const [toAmount, setToAmount] = useState<string[]>([]);

  const collaterals = isMint ? selectedFrom : selectedTo;

  const isBadCollateral1 = useIsBadCollateralAsset({
    collateral: collaterals?.[0]?.address as Address,
  });

  const isBadCollateral2 = useIsBadCollateralAsset({
    collateral:
      (collaterals?.[1]?.address as Address) ||
      getAddress("0x0000000000000000000000000000000000000000"),
  });

  const isBadCollateral: (
    | {
        isBlacklisted: any;
        isDepegged: boolean;
      }
    | undefined
  )[] = [isBadCollateral1.data, isBadCollateral2.data];

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

  const fromBalance = [fromBalance1.useBalance(), fromBalance2.useBalance()];

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

  const toBalance = [tobalance1.useBalance(), toBalance2.useBalance()];

  const { isReady, account } = useBeraJs();

  const allowance1 = usePollAllowance({
    spender: honeyFactoryAddress,
    token: selectedFrom?.[0] ?? undefined,
  });

  const allowance2 = usePollAllowance({
    spender: honeyFactoryAddress,
    token: selectedFrom?.[1] ?? undefined,
  });

  const allowance = [allowance1.data ?? "0", allowance2.data ?? "0"];

  const { getCollateralRate, isLoading: isFeeLoading } = useCollateralsRates({
    collateralList: collateralList?.map((token: any) => token.address) ?? [],
  });

  const params = collaterals?.length
    ? getCollateralRate(collaterals[0].address as Address)
    : undefined;

  const fee = params ? (isMint ? params.mintFee : params.redeemFee) : 0;

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

  const { data: previewRes, isLoading: isHoneyPreviewLoading } =
    usePollHoneyPreview({
      collateral: isTyping ? undefined : collaterals?.[0],
      collateralList: isBasketModeEnabled ? collateralList : undefined,
      amount: (givenIn ? fromAmount[0] : toAmount[0]) ?? "0",
      mint: isMint,
      given_in: givenIn,
    });

  useEffect(() => {
    if (givenIn) setToAmount(previewRes ?? []);
    else setFromAmount(previewRes ?? []);
  }, [previewRes]);

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

  const payload =
    collaterals && account
      ? ([
          collaterals?.[0]?.address,
          parseUnits(
            fromAmount?.[0] ?? "0",
            (isMint ? collaterals?.[0]?.decimals : honey?.decimals) ?? 18,
          ),
          account ?? "",
          !!isBasketModeEnabled,
        ] as const)
      : undefined;

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

  const exceedBalance = [
    BigNumber(fromAmount?.[0] ?? "0").gt(
      fromBalance?.[0]?.formattedBalance ?? "0",
    ),
    BigNumber(fromAmount?.[1] ?? "0").gt(
      fromBalance?.[1]?.formattedBalance ?? "0",
    ),
  ];

  const isLoading = isUseTxnLoading || isHoneyPreviewLoading;
  return {
    account,
    payload,
    allowance,
    setSelectedFrom,
    isLoading,
    write,
    selectedFrom,
    selectedTo,
    fee,
    isReady,
    isFeeLoading,
    setSelectedTo,
    fromAmount,
    setFromAmount,
    toAmount,
    setToAmount,
    isMint,
    fromBalance,
    toBalance,
    onSwitch,
    ModalPortal,
    setGivenIn,
    needsApproval,
    refreshAllowances,
    exceedBalance,
    honey,
    collateralList,
    setIsTyping,
    isTyping,
    isBadCollateral,
    isBasketModeEnabled,
  };
};
