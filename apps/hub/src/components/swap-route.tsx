import { Token } from "@bera/berajs";
import { TokenIcon } from "@bera/shared-ui";
import { Icons } from "@bera/ui/icons";
import { SorHop } from "@berachain-foundation/berancer-sdk";

import { SwapInfoV4 } from "~/b-sdk/usePollBalancerSwap";

export const SwapRoute = ({
  swapInfo,
  tokenIn,
  tokenOut,
}: {
  swapInfo: SwapInfoV4;
  tokenIn: Token;
  tokenOut: Token;
}) => {
  return (
    <div className="mb-4 flex w-full flex-row flex-wrap items-center gap-2 rounded-md border border-border p-4">
      <TokenIcon address={tokenIn.address} size={"lg"} />
      <span className="text-sm font-medium">{tokenIn.symbol}</span>

      {swapInfo.routes.map((route, routeIndex) => (
        <div key={routeIndex} className="flex flex-row items-center gap-2">
          {route.hops.map((hop: SorHop, hopIndex: number) => (
            <div key={hopIndex} className="flex items-center gap-2">
              <Icons.arrowRight className="h-4 w-4" />
              <TokenIcon address={hop.tokenIn} size={"lg"} />
              <TokenIcon
                address={hop.tokenOut}
                size={"lg"}
                className="ml-[-8px]"
              />
            </div>
          ))}
        </div>
      ))}

      <Icons.arrowRight className="h-4 w-4" />
      <TokenIcon address={tokenOut.address} size={"lg"} />
      <span className="text-sm font-medium">{tokenOut.symbol}</span>
    </div>
  );
};
