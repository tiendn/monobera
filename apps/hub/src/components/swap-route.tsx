import { Token } from "@bera/berajs";
import { TokenIcon } from "@bera/shared-ui";
import { Icons } from "@bera/ui/icons";
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
      <Icons.arrowRight className="h-4 w-4" />
      {swapInfo.swapPaths.map((step, index) => (
        <div key={index} className="flex flex-row">
          <TokenIcon address={step.tokens[0].address} size={"lg"} />
          <TokenIcon
            address={step.tokens[1].address} // FIXME: We are assuming the tokens involved here by pool idx vs using the route that exists in gql (route)
            size={"lg"}
            className="ml-[-8px]"
          />
        </div>
      ))}
      <Icons.arrowRight className="h-4 w-4" />
      <TokenIcon address={tokenOut.address} size={"lg"} />
      <span className="text-sm font-medium">{tokenOut.symbol}</span>
    </div>
  );
};
