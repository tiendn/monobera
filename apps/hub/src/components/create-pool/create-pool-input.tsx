import React from "react";
import { type Token } from "@bera/berajs";
import {
  beraTokenAddress,
  bgtTokenAddress,
  nativeTokenAddress,
} from "@bera/config";
import { SelectToken } from "@bera/shared-ui";
import { Icons } from "@bera/ui/icons";
import { InputWithLabel } from "@bera/ui/input";
import { formatUnits, parseUnits } from "viem";

type Props = {
  token: Token | undefined;
  selectedTokens: Token[];
  weight?: bigint;
  displayWeight?: boolean;
  displayRemove?: boolean;
  locked: boolean;
  index: number;
  selectable?: boolean;
  onTokenSelection: (token: Token | undefined) => void;
  onWeightChange: (index: number, newWeight: bigint) => void;
  onLockToggle: (index: number) => void;
  onRemoveToken: (index: number) => void;
};

export default function CreatePoolInput({
  token,
  selectedTokens,
  weight,
  displayWeight,
  displayRemove,
  locked,
  index,
  selectable = true,
  onTokenSelection,
  onWeightChange,
  onLockToggle,
  onRemoveToken,
}: Props) {
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const weightInBigInt = parseUnits(e.target.value, 16);
      onWeightChange(index, weightInBigInt);
    } catch (e) {
      // NOTE: this is likely a parsing error, ex: user has entered a non-numeric character
    }
  };

  return (
    <div className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-3">
      <SelectToken
        token={token}
        // TODO: we should handle wrapping when adding liquidity, but for pool token selection it cannot be BERA itself.
        filter={[bgtTokenAddress, nativeTokenAddress]}
        selectable={selectable}
        onTokenSelection={(selectedToken: Token | undefined) =>
          onTokenSelection(selectedToken)
        }
        selectedTokens={selectedTokens}
        btnClassName="border-none"
      />

      {/* Weight Input */}
      <div className="ml-auto flex items-center">
        {displayWeight && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-sm text-gray-400">%</span>
            <InputWithLabel
              type="text"
              // NOTE: weight is 18 decimalized and we input it as a %, so we use 16 decimalized for the input
              // NOTE: if a weight is negative internally we will clamp it to 0 in the display (but an error is shown)
              value={weight ? formatUnits(weight < 0n ? 0n : weight, 16) : "0"}
              onChange={handleWeightChange}
              className="w-52 rounded-md border bg-transparent text-center text-white"
            />

            <button
              type="button"
              onClick={() => onLockToggle(index)}
              className="ml-2 mr-6"
            >
              {locked ? (
                <Icons.lock className="h-4 w-4" />
              ) : (
                <Icons.unlock className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {/* Remove Button */}
        {displayRemove && (
          <button
            type="button"
            onClick={() => onRemoveToken(index)}
            className="mx-2 hover:text-white focus:outline-none"
          >
            <Icons.xCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
