"use client";

import { useMemo, useState } from "react";
import { PoolWithMethods } from "@balancer-labs/sdk";
import { Token, useBeraJs, useTokens, type PoolV2 } from "@bera/berajs";
import { AddLiquidityInput, InputAmount } from "@bera/berajs/actions";
import { ADDRESS_ZERO } from "@bera/berajs/config";
import { beraTokenAddress, crocDexAddress } from "@bera/config";
import { beraToken, wBeraToken } from "@bera/wagmi";
import { type Address } from "viem";

import { isBeratoken } from "~/utils/isBeraToken";
import { useCrocPoolPrice } from "~/hooks/useCrocPoolPrice";
import useMultipleTokenApprovalsWithSlippage from "~/hooks/useMultipleTokenApprovalsWithSlippage";
import useMultipleTokenInput from "~/hooks/useMultipleTokenInput";

export const useAddLiquidity = (args: {
  pool: PoolWithMethods | undefined;
}) => {};
