"use client";

import { useEffect, useState } from "react";
import { usePollAllowances, type Token } from "@bera/berajs";
import { parseUnits } from "viem";

const useCreatePool = ({
  baseToken,
  quoteToken,
  baseAmount,
  quoteAmount,
}: {
  baseToken: Token;
  quoteToken: Token;
  baseAmount: string;
  quoteAmount: string;
}) => {
  const [needsApproval, setNeedsApproval] = useState<Token[]>([]);

  return {
    needsApproval,
    refreshAllowances: () => {},
  };
};

export default useCreatePool;
